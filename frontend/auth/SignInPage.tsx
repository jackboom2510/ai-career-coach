import React from 'react';
import { SignIn } from '@clerk/clerk-react';

const SignInPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">AI Career Coach</h1>
        <p className="text-slate-500 text-sm">Sign in to access your personalized career roadmap</p>
      </div>
      <SignIn
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'shadow-xl border border-slate-200',
          },
        }}
      />
    </div>
  );
};

export default SignInPage;
