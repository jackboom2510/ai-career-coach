import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
];

const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();

  const handleChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
  };

  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-slate-500" />
      <select
        value={i18n.language}
        onChange={(e) => handleChange(e.target.value)}
        className="text-xs bg-transparent border-none outline-none cursor-pointer text-slate-600 hover:text-slate-800"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code} className="bg-white">
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSelector;