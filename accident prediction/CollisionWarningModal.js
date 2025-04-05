import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button } from 'react-bootstrap';

// Hook to get the best available female voice
const useSpeechSynthesis = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [voice, setVoice] = useState(null);

  useEffect(() => {
    if ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) {
      setIsSupported(true);

      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        const femaleVoice = voices.find(v =>
          v.name.includes("Female") ||
          v.name.includes("Samantha") ||
          v.name.includes("Google UK English Female") ||
          (v.lang.startsWith("en") && v.name.toLowerCase().includes("female"))
        );

        setVoice(femaleVoice || voices.find(v => v.lang.startsWith("en")));
      };

      // Chrome loads voices asynchronously
      window.speechSynthesis.onvoiceschanged = loadVoices;
      loadVoices();
    }
  }, []);

  return { isSupported, voice };
};

const speak = (text, voice) => {
  const utterance = new SpeechSynthesisUtterance(text);
  if (voice) utterance.voice = voice;
  utterance.rate = 1;
  utterance.pitch = 1.2; // Slightly higher pitch for friendliness
  utterance.volume = 1;
  window.speechSynthesis.speak(utterance);
};

const CollisionWarningModal = ({ show, onHide, onEmergency }) => {
  const audioRef = useRef(null);
  const { isSupported, voice } = useSpeechSynthesis();

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  useEffect(() => {
    if (show) {
      if (isSupported && voice) {
        try {
          speak("Reduce your speed immediately. You are exceeding your limit.", voice);
        } catch (error) {
          console.error("Error with speech synthesis:", error);
          playBeepSounds();
        }
      } else {
        playBeepSounds();
      }

      return () => {
        if (isSupported) window.speechSynthesis.cancel();
        if (audioRef.current && typeof audioRef.current.stop === 'function') {
          audioRef.current.stop();
        }
      };
    }
  }, [show, isSupported, voice]);

  const playBeepSounds = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const audioCtx = new AudioContext();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.value = 880;

      gainNode.gain.value = 0.5;

      oscillator.start();

      let isOn = true;
      const interval = setInterval(() => {
        gainNode.gain.value = isOn ? 0 : 0.5;
        isOn = !isOn;
      }, 500);

      audioRef.current = {
        stop: () => {
          clearInterval(interval);
          oscillator.stop();
          audioCtx.close();
        }
      };
    } catch (error) {
      console.error("Error creating audio fallback:", error);
    }
  };

  const handleDismiss = () => {
    if (isSupported) window.speechSynthesis.cancel();
    if (audioRef.current && typeof audioRef.current.stop === 'function') {
      audioRef.current.stop();
    }
    onHide();
  };

  return (
    <Modal show={show} onHide={handleDismiss} centered backdrop="static">
      <Modal.Header className="bg-danger text-white">
        <Modal.Title className="text-center w-100">
          <h2>Advanced Accident Prediction & Alert System</h2>
          <h3>COLLISION WARNING</h3>
          <p className="mb-0">P1 sensor technology</p>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center">
        <div className="bg-warning p-3 rounded-circle d-inline-block mb-3">
          <i className="fas fa-exclamation-triangle fa-3x"></i>
        </div>
        <h4 className="text-danger">Potential Collision Detected!</h4>
        <p className="mb-2">Reduce speed immediately</p>
        <p className="text-muted">Alert sent to nearby emergency stations</p>
        <div className="d-flex gap-3 justify-content-center mt-4">
          <Button variant="secondary" onClick={handleDismiss} size="lg">
            Dismiss Alert
          </Button>
          <Button variant="danger" onClick={onEmergency} size="lg">
            Contact Emergency Services
          </Button>
        </div>
      </Modal.Body>
    </Modal>
  );
};

const AlertDemo = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const speedTimerRef = useRef(null);
  const speedExceededRef = useRef(false);
  const { isSupported, voice } = useSpeechSynthesis();

  useEffect(() => {
    const welcomeTimeout = setTimeout(() => {
      if (isSupported && voice) {
        speak("Welcome to SafeAlert. Drive safe and have a pleasant journey.", voice);
      }
    }, 3000);

    return () => {
      clearTimeout(welcomeTimeout);
      window.speechSynthesis.cancel();
    };
  }, [isSupported, voice]);

  useEffect(() => {
    if (speedTimerRef.current) {
      clearTimeout(speedTimerRef.current);
      speedTimerRef.current = null;
    }

    if (currentSpeed >= 100 && !speedExceededRef.current) {
      speedExceededRef.current = true;
      speedTimerRef.current = setTimeout(() => {
        setShowWarning(true);
      }, 5000);
    } else if (currentSpeed < 100) {
      speedExceededRef.current = false;
    }
  }, [currentSpeed]);

  const handleEmergencyContact = () => {
    alert("Emergency services have been contacted!");
  };

  const handleDismiss = () => {
    setShowWarning(false);
  };

  const handleAlertDemoClick = () => {
    setShowWarning(true);
  };

  return (
    <div className="p-4">
      <Button
        variant="warning"
        className="d-flex align-items-center"
        onClick={handleAlertDemoClick}
        style={{ backgroundColor: '#ffc107', color: '#000', border: 'none', padding: '8px 16px' }}
      >
        <i className="fas fa-bell me-2"></i>
        Alert Demo
      </Button>

      <CollisionWarningModal
        show={showWarning}
        onHide={handleDismiss}
        onEmergency={handleEmergencyContact}
      />
    </div>
  );
};

const SafetySystem = () => {
  return (
    <div>
      <AlertDemo />
    </div>
  );
};

export default SafetySystem;
