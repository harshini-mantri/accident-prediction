import { useState, useEffect } from 'react';

const useSpeechSynthesis = () => {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window);
  }, []);

  return isSupported;
};

export default useSpeechSynthesis;
