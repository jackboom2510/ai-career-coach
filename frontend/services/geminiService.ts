import { GoogleGenAI, Type, Schema } from "@google/genai";
import { UserProfile, StudyPlan, RoadmapWeek, Task, CVAnalysisResult } from "../types";

const apiKey = process.env.API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export type ThinkingCallback = (thought: string) => void;

const MAX_RETRIES = 3;
const INITIAL_DELAY = 1000;

async function withRetry<T>(fn: () => Promise<T>, context: string): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const status = (error as { response?: { status?: number } })?.response?.status;
      
      if (status && (status === 503 || status === 429 || status === 500 || status >= 500)) {
        const delay = INITIAL_DELAY * Math.pow(2, attempt - 1);
        console.warn(`Retry ${context}: attempt ${attempt}/${MAX_RETRIES} failed (${status}), waiting ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

// Helper to define task schema separately so we can reuse or nest it
const taskSchema = { 
  type: Type.OBJECT,
  properties: {
    description: { type: Type.STRING },
    estimatedHours: { type: Type.NUMBER, description: "Estimated time in hours (e.g. 0.5, 1.5, 2)" },
    difficulty: { type: Type.STRING, enum: ["Beginner", "Intermediate", "Advanced"] }
  },
  required: ["description", "estimatedHours", "difficulty"]
};

const roadmapWeekSchema = {
  type: Type.OBJECT,
  properties: {
    weekNumber: { type: Type.INTEGER },
    theme: { type: Type.STRING },
    description: { type: Type.STRING },
    priorities: { type: Type.ARRAY, items: { type: Type.STRING } },
    tasks: { type: Type.ARRAY, items: taskSchema },
    suggestedResources: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING, description: "Resource title and URL (e.g. 'React Docs - https://react.dev')" } 
    },
  },
  required: ["weekNumber", "theme", "description", "priorities", "tasks"],
};

const fullPlanSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    roadmap: {
      type: Type.ARRAY,
      items: roadmapWeekSchema,
    },
    projectIdeas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          problem: { type: Type.STRING },
          tools: { type: Type.ARRAY, items: { type: Type.STRING } },
          outcome: { type: Type.STRING },
          difficulty: { type: Type.STRING, enum: ["Beginner", "Intermediate", "Advanced"] },
        },
        required: ["title", "problem", "tools", "outcome", "difficulty"],
      },
    },
    weeklyStrategy: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING, description: "A summary of how to approach a typical week based on user availability" },
        timeBlocks: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              blockName: { type: Type.STRING },
              durationMinutes: { type: Type.INTEGER },
              activityType: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ["blockName", "durationMinutes", "activityType", "description"],
          },
        },
        tips: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["summary", "timeBlocks", "tips"],
    },
  },
  required: ["roadmap", "projectIdeas", "weeklyStrategy"],
};

// Types for raw API response
interface RawTask {
    description: string;
    estimatedHours: number;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}
interface RawRoadmapWeek extends Omit<RoadmapWeek, 'tasks'> {
  tasks: RawTask[];
}
interface RawStudyPlan extends Omit<StudyPlan, 'roadmap'> {
  roadmap: RawRoadmapWeek[];
}

export const analyzeCV = async (cvText: string, targetRole: string): Promise<CVAnalysisResult> => {
  const model = "gemini-3.1-pro-preview";
  
  const prompt = `
    Analyze the following CV text against the target role of "${targetRole}".
    Identify skills the user already has (Detected Skills) and key skills they are missing for the target role (Missing Skills).
    Provide a 2-3 sentence summary of how a study plan should bridge these gaps.
    
    CV Text (Truncated): "${cvText.slice(0, 8000)}"
  `;

  try {
    console.log("DEBUG: analyzeCV prompt:", prompt);
    const response = await withRetry(async () => {
      return await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
              missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
              gapAnalysisSummary: { type: Type.STRING }
            },
            required: ["detectedSkills", "missingSkills", "gapAnalysisSummary"]
          }
        }
      });
    }, "CV Analysis");

    const text = response.text;
    if (!text) throw new Error("No response from Gemini CV analysis.");
    return JSON.parse(text) as CVAnalysisResult;

  } catch (error) {
    console.error("Error analyzing CV:", error);
    return {
      detectedSkills: ["Skills from CV"],
      missingSkills: ["Target Role Skills"],
      gapAnalysisSummary: "Could not fully analyze CV, but we will proceed with the general plan."
    };
  }
};

export const generateStudyPlan = async (
  profile: UserProfile,
  onThinking?: ThinkingCallback
): Promise<StudyPlan> => {
  const model = "gemini-3.1-pro-preview";

  let prompt = `
    Act as a world-class technical career coach.
    Create a detailed ${profile.timelineMonths}-month (approx ${profile.timelineMonths * 4} weeks) study roadmap for a user with the following profile:
    
    Current Role: ${profile.currentRole}
    Target Role: ${profile.targetRole}
    Current Skills: ${profile.currentSkills}
    Weak Areas: ${profile.weakAreas}
    Time Available: ${profile.availability}
    Learning Style: ${profile.learningStyle}
  `;

  if (profile.cvText) {
    prompt += `
    \n**CV/Resume Context**:
    The user has provided their CV text. Use this to identify specific gaps.
    CV Content: "${profile.cvText.slice(0, 8000)}" (truncated if too long).
    Adjust the roadmap to specifically address missing skills found in the CV compared to the Target Role.
    `;
  }

  prompt += `
    \nThe plan must be realistic, specifically tailored to transitioning while working full-time.
    
    Requirements:
    1. **Roadmap**: Break down the timeline into weeks. Each week should have a clear theme and actionable tasks.
    2. **Task Estimates**: IMPORTANT: For every task, estimate the time in hours (0.5 to 4 hours) AND difficulty level (Beginner, Intermediate, Advanced).
    3. **Project Ideas**: Suggest 5 concrete portfolio projects relevant to the ${profile.targetRole}. These should solve real problems.
    4. **Weekly Strategy**: Provide a generic strategy for how they should structure their limited time each week (Time Blocks).
    5. **Resources**: Suggest high-quality, free or accessible resources (docs, tutorials) with URLs where possible.
    
    **RESOURCE SCORING RUBRIC (Strictly Apply - Minimum 70/100 to include)**:
    1. **SOURCE AUTHORITY (30 pts)**: Official docs/universities (30), Established platforms (25), Verified publishers (20).
    2. **ACCESSIBILITY (25 pts)**: 100% Free no-signup (25), Freemium (15), Paid (0). **Prioritize FREE.**
    3. **RELEVANCE (25 pts)**:
       - *Temporal*: For fast-moving tech (AI, Web), <12mo old = 10pts. For stable tech (SQL, Math), age matters less if authority is high.
       - *Topic*: Perfect match (10pts).
       - *Level*: Appropriate difficulty (5pts).
    4. **COMMUNITY VALIDATION (15 pts)**: High stars/views/ratings.
    5. **FORMAT (5 pts)**: Interactive/Video+Code (5), Docs (3).

    *Scoring Examples*:
    - ✅ Andrew Ng ML (Classic/High Authority) -> Include
    - ✅ React.dev (Official/Recent) -> Include
    - ❌ Random Blog (Low Authority) -> Exclude
    
    Ensure the tone is encouraging but rigorous.
  `;

  try {
    console.log("DEBUG: generateStudyPlan prompt:", {
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: fullPlanSchema,
        thinkingConfig: { thinkingBudget: 1024 },
      },
    });
    onThinking?.("Analyzing your profile and researching job market trends...");

    const stream = await withRetry(async () => {
      return await ai.models.generateContentStream({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: fullPlanSchema,
          thinkingConfig: { thinkingBudget: 1024 },
        },
      });
    }, "Generate Study Plan");

    let fullText = "";
    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        onThinking?.("Processing and generating your personalized roadmap...");
      }
    }

    if (!fullText) throw new Error("No response from Gemini.");
    
    try {
      const rawPlan = JSON.parse(fullText) as RawStudyPlan;

      // Transform tasks to include completed state
      const roadmapWithObjects = rawPlan.roadmap.map(week => ({
        ...week,
        tasks: week.tasks.map(t => ({ 
            description: t.description, 
            estimatedHours: t.estimatedHours,
            difficulty: t.difficulty,
            completed: false 
        }))
      }));

      return {
        ...rawPlan,
        roadmap: roadmapWithObjects
      };
    } catch (parseError) {
      console.error("Error parsing Gemini study plan response:", parseError, fullText.slice(0, 1200));
      throw parseError;
    }

  } catch (error) {
    console.error("Error generating study plan:", error);
    throw error;
  }
};

export const regenerateWeekPlan = async (
  weekNumber: number,
  currentPlan: RoadmapWeek,
  profile: UserProfile
): Promise<RoadmapWeek> => {
  const model = "gemini-3.1-pro-preview";

  const prompt = `
    The user needs to regenerate the plan for **Week ${weekNumber}** of their study roadmap.
    Life happened, or the previous plan wasn't suitable.
    
    User Target: ${profile.targetRole}
    Current Week Theme: ${currentPlan.theme}
    Current Week Description: ${currentPlan.description}
    
    Please provide a FRESH, alternative set of priorities and tasks for Week ${weekNumber}.
    Keep the theme similar if it fits the overall flow, but adjust the specific tasks and priorities to be manageable yet effective.
    Include estimated hours and difficulty for each task.

    **RESOURCE QUALITY**:
    If suggesting new resources, apply this scoring rubric (min 70/100):
    - Authority (30pts): Official docs/Universities preferred.
    - Accessibility (25pts): Free preferred.
    - Relevance (25pts): Recent for fast tech, Classic for foundations.
    - Community (15pts): High validation.
  `;

  try {
    console.log("DEBUG: regenerateWeekPlan prompt:", prompt);
    const response = await withRetry(async () => {
      return await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: roadmapWeekSchema,
        },
      });
    }, "Regenerate Week Plan");

    const text = response.text;
    if (!text) throw new Error("No response from Gemini.");

    const rawWeek = JSON.parse(text) as RawRoadmapWeek;
    
    return {
      ...rawWeek,
      tasks: rawWeek.tasks.map(t => ({ 
          description: t.description, 
          estimatedHours: t.estimatedHours,
          difficulty: t.difficulty,
          completed: false 
      }))
    };

  } catch (error) {
    console.error("Error regenerating week:", error);
    throw error;
  }
};

export const chatWithCoach = async (
    message: string, 
    context: string,
    history: {role: string, parts: {text: string}[]}[] = []
): Promise<string> => {
    const model = "gemini-3.1-pro-preview";
    
    const systemInstruction = `
        You are an encouraging, expert AI Career Coach. 
        You are helping a user transition into a tech career.
        The user is currently working on a specific week of their roadmap.
        
        Context provided:
        ${context}
        
        Answer their questions concisely (under 100 words unless detail is requested).
        Be supportive, clarify technical concepts, or suggest strategies.
        If they ask about a specific task, refer to the context.
    `;

    try {
        const chatSession = ai.chats.create({
            model,
            config: { systemInstruction },
            history: history
        });

        const result = await withRetry(async () => {
          return await chatSession.sendMessage({ message });
        }, "Chat with Coach");
        return result.text || "I'm having trouble thinking of a response right now.";
    } catch (e) {
        console.error("Chat error", e);
        return "Sorry, I couldn't connect to the coach right now. Please try again.";
    }
};


export const chatWithCoachBackend = async (
    message: string,
    userProfile?: { target_role?: string; current_role?: string; timeline_months?: number },
    roadmapState?: any,
    currentWeek?: number,
    userId?: string,
    conversationId?: string,
    userLanguage?: string
): Promise<{ response: string; conversation_id: string; tools_called?: any[] }> => {
    const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000";
    
    try {
        const payload = {
            message,
            user_profile: userProfile || null,
            roadmap_state: roadmapState || null,
            current_week: currentWeek || 1,
            user_id: userId || "default",
            conversation_id: conversationId || null,
            user_language: userLanguage || "Vietnamese"
        };

        const response = await fetch(`${baseURL}/agent/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Backend error");
        }

        return await response.json();
    } catch (error) {
        console.error("Backend chat error:", error);
        throw error;
    }
};



export const generateQuizForWeek = async (theme: string): Promise<any[]> => {
  // Dùng 1.5-flash cho task này để đảm bảo tốc độ sinh Quiz < 2 giây
  const model = "gemini-3.1-pro-preview"; 
  const prompt = `Bạn là chuyên gia khảo thí khắt khe. Hệ thống đang cần kiểm tra người dùng xem họ có thực sự đã học xong chủ đề: "${theme}" hay chưa.
  Hãy tạo đúng 3 câu hỏi trắc nghiệm (độ khó vừa phải). Mỗi câu có 4 đáp án.`;

  try {
    console.log(`DEBUG: Đang gọi Gemini tạo Quiz cho chủ đề: ${theme}`);
    
    const response = await withRetry(async () => {
      return await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          // Dùng responseSchema để ép Gemini phải trả về đúng cấu trúc Mảng Object
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  description: "Chứa chính xác 4 lựa chọn (A, B, C, D)"
                },
                correctIndex: { type: Type.INTEGER, description: "Vị trí của đáp án đúng (từ 0 đến 3)" }
              },
              required: ["question", "options", "correctIndex"]
            }
          }
        }
      });
    }, "Generate AI Quiz");

    const text = response.text;
    if (!text) throw new Error("Không nhận được phản hồi từ Gemini.");
    
    return JSON.parse(text);

  } catch (error) {
    console.error("Lỗi khi tạo Quiz bằng Gemini:", error);
    // Kịch bản Fallback: Trả về câu hỏi mặc định nếu AI sập mạng, không làm kẹt luồng học của user
    return [
      { question: `Bạn đã thực sự nắm vững kiến thức về ${theme}?`, options: ["Chắc chắn", "Hơi hơi", "Chưa rõ", "Bỏ qua"], correctIndex: 0 },
      { question: "Để học tiếp, bạn cần tinh thần thế nào?", options: ["Quyết tâm", "Lười biếng", "Bỏ cuộc", "Chán nản"], correctIndex: 0 },
      { question: "Mục tiêu tiếp theo của bạn là gì?", options: ["Hoàn thành lộ trình", "Bỏ dở", "Đi ngủ", "Chơi game"], correctIndex: 0 }
    ];
  }
};