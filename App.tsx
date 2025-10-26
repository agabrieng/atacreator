
import React, { useState, useCallback } from 'react';
import type { MeetingMinutes } from './types';
import { generateMinutesFromTranscript } from './services/geminiService';
import { PLACEHOLDER_VTT } from './constants';
import Header from './components/Header';
import TranscriptInput from './components/TranscriptInput';
import MinutesDisplay from './components/MinutesDisplay';
import Loader from './components/Loader';
import { AlertTriangleIcon } from './components/icons';

const App: React.FC = () => {
  const [vttContent, setVttContent] = useState<string>('');
  const [meetingTitle, setMeetingTitle] = useState<string>('');
  const [minutes, setMinutes] = useState<MeetingMinutes | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!vttContent.trim()) {
      setError('Por favor, insira o conteúdo da transcrição VTT.');
      return;
    }
    if (!meetingTitle.trim()) {
      setError('Por favor, insira o título da reunião.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setMinutes(null);

    try {
      const generatedMinutes = await generateMinutesFromTranscript(vttContent, meetingTitle);
      setMinutes(generatedMinutes);
    } catch (err) {
      console.error(err);
      setError('Ocorreu um erro ao gerar a ata. Verifique o console para mais detalhes e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, [vttContent, meetingTitle]);

  const handleUseSample = useCallback(() => {
    setVttContent(PLACEHOLDER_VTT);
    setMeetingTitle('Reunião de Alinhamento Semanal - Projeto Phoenix');
    setError(null);
  }, []);

  const handleClear = useCallback(() => {
    setVttContent('');
    setMeetingTitle('');
    setMinutes(null);
    setError(null);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-200 font-sans">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <TranscriptInput
            vttContent={vttContent}
            setVttContent={setVttContent}
            meetingTitle={meetingTitle}
            setMeetingTitle={setMeetingTitle}
            onGenerate={handleGenerate}
            onUseSample={handleUseSample}
            onClear={handleClear}
            isLoading={isLoading}
          />
          <div className="relative lg:sticky top-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 min-h-[calc(100vh-10rem)]">
            {isLoading && <Loader />}
            {error && (
              <div className="flex flex-col items-center justify-center h-full text-center text-red-500">
                <AlertTriangleIcon className="w-16 h-16 mb-4" />
                <h3 className="text-xl font-semibold mb-2">Erro ao Processar</h3>
                <p className="max-w-md">{error}</p>
              </div>
            )}
            {!isLoading && !error && (
              <MinutesDisplay minutes={minutes} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
