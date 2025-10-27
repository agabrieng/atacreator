
import React, { useState, useCallback, useEffect } from 'react';
import type { AtaData, AdminSettings, Participant } from './types';
import { generateAtaData } from './services/geminiService';
import { saveAtaToFirestore } from './services/firebaseService';
import { PLACEHOLDER_VTT } from './constants';
import Header from './components/Header';
import InputForm from './components/InputForm';
import MinutesDisplay from './components/MinutesDisplay';
import Loader from './components/Loader';
import { AlertTriangleIcon } from './components/icons';

const DEFAULT_COMPANY_NAME = "Minha Empresa";
const DEFAULT_SETTINGS: AdminSettings = {
    companyName: DEFAULT_COMPANY_NAME,
    companyLogo: null,
    docNumber: 'FM-GCO-RM2-002',
    revision: '00',
    propertyInfo: 'AS INFORMAÇÕES DESTE DOCUMENTO SÃO DE PROPRIEDADE DA SUA EMPRESA, SENDO PROIBIDA A UTILIZAÇÃO FORA DA SUA FINALIDADE.',
};

const App: React.FC = () => {
  const [companyProfiles, setCompanyProfiles] = useState<Record<string, AdminSettings>>({});
  const [currentCompanyName, setCurrentCompanyName] = useState<string>('');
  
  const adminSettings = companyProfiles[currentCompanyName] || null;

  const [empreendimento, setEmpreendimento] = useState('');
  const [area, setArea] = useState('');
  const [titulo, setTitulo] = useState('');
  const [contrato, setContrato] = useState('');
  const [assunto, setAssunto] = useState('');
  const [local, setLocal] = useState('');
  const [participantes, setParticipantes] = useState<Participant[]>([]);
  const [vttContent, setVttContent] = useState<string>('');
  
  const [ata, setAta] = useState<AtaData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedProfilesStr = localStorage.getItem('ata-company-profiles');
      let profiles: Record<string, AdminSettings> = {};
      if (savedProfilesStr) {
        profiles = JSON.parse(savedProfilesStr);
      }
      
      if (Object.keys(profiles).length === 0) {
        profiles[DEFAULT_COMPANY_NAME] = DEFAULT_SETTINGS;
      }
      setCompanyProfiles(profiles);

      const savedCurrentCompany = localStorage.getItem('ata-current-company-name');
      if (savedCurrentCompany && profiles[savedCurrentCompany]) {
        setCurrentCompanyName(savedCurrentCompany);
      } else {
        setCurrentCompanyName(Object.keys(profiles)[0]);
      }
    } catch (e) {
      console.error("Failed to load settings from localStorage", e);
      setCompanyProfiles({ [DEFAULT_COMPANY_NAME]: DEFAULT_SETTINGS });
      setCurrentCompanyName(DEFAULT_COMPANY_NAME);
    }
  }, []);

  const handleSettingsSave = useCallback((profiles: Record<string, AdminSettings>, currentCompany: string) => {
    setCompanyProfiles(profiles);
    setCurrentCompanyName(currentCompany);
    localStorage.setItem('ata-company-profiles', JSON.stringify(profiles));
    localStorage.setItem('ata-current-company-name', currentCompany);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!vttContent.trim() || !titulo.trim() || !empreendimento.trim()) {
      setError('Por favor, preencha o Título, Empreendimento e a Transcrição.');
      return;
    }
    if (!adminSettings) {
      setError("As configurações da empresa não foram carregadas. Por favor, verifique as configurações e selecione uma empresa.");
      return;
    }
    
    if (contrato.trim()) {
        try {
            const savedHeadersStr = localStorage.getItem('ata-header-data') || '{}';
            const savedHeaders = JSON.parse(savedHeadersStr);
            savedHeaders[contrato.trim()] = { empreendimento, area, titulo, contrato, assunto, local };
            localStorage.setItem('ata-header-data', JSON.stringify(savedHeaders));
        } catch (e) {
            console.error("Failed to save header data to localStorage", e);
        }
    }

    setIsLoading(true);
    setError(null);
    setAta(null);

    try {
      const generatedPart = await generateAtaData(vttContent, titulo);
      
      const existingParticipantNames = new Set(participantes.map(p => p.nome.toLowerCase().trim()));
      const updatedParticipants = [...participantes];

      if (generatedPart.participantes) {
        generatedPart.participantes.forEach(geminiParticipant => {
            const trimmedName = geminiParticipant.nome.trim();
            if (trimmedName && !existingParticipantNames.has(trimmedName.toLowerCase())) {
                updatedParticipants.push({
                    id: `${Date.now()}-${trimmedName}`,
                    nome: trimmedName,
                    empresa: geminiParticipant.empresa || '',
                    email: '',
                    status: 'P',
                });
                existingParticipantNames.add(trimmedName.toLowerCase());
            }
        });
      }

      setParticipantes(updatedParticipants);

      const finalAta: AtaData = {
        logoUrl: adminSettings.companyLogo,
        empreendimento,
        area,
        titulo,
        numeroDocumento: adminSettings.docNumber,
        revisao: adminSettings.revision,
        contrato,
        assunto,
        local,
        horario: generatedPart.horario,
        data: generatedPart.data,
        participantes: updatedParticipants,
        observacoes: generatedPart.observacoes,
        pauta: generatedPart.pauta,
        informacaoPropriedade: adminSettings.propertyInfo,
      };

      setAta(finalAta);

    } catch (err) {
      console.error(err);
      let errorMessage = 'Ocorreu um erro ao gerar a ata. Verifique o console para mais detalhes e tente novamente.';
      if (err instanceof Error) {
        if (err.message === 'API_KEY_MISSING') {
            errorMessage = 'A chave de API não foi encontrada. Verifique se a sua chave está configurada corretamente no ambiente.';
        } else if (err.message.includes('API key not valid')) {
            errorMessage = 'A chave de API fornecida não é válida. Por favor, verifique a configuração e tente novamente.';
        }
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [vttContent, titulo, empreendimento, area, contrato, assunto, local, participantes, adminSettings]);

  const handleUseSample = useCallback(() => {
    setError(null);
    setEmpreendimento('Obra67 - Ampliação “K” / Eletrobrás');
    setArea('RM2 Execução de Obra');
    setTitulo('ATA DE REUNIÃO');
    setContrato('4500080496 - Implantação da Ampliação "K" da Subestação Gravataí 525/230 kV');
    setAssunto('Execução de Obra');
    setLocal('virtual Teams');
    setParticipantes([
        { id: '1', empresa: 'RM2', nome: 'Joacir Manoel', email: 'joacir.honorato@rm2engenharia.com.br', status: 'A' },
        { id: '2', empresa: 'RM2', nome: 'Rodrigo Martins', email: 'rodrigo.silva@rm2engenharia.com.br', status: 'P' },
        { id: '3', empresa: 'RM2', nome: 'Reinaldo Antônio Ferreira', email: 'reinaldo.lima@rm2engenharia.com.br', status: 'P' },
        { id: '4', empresa: 'RM2', nome: 'Reginaldo Lafaiete', email: 'reginaldo.santos@rm2engenharia.com.br', status: 'P' },
    ]);
    setVttContent(PLACEHOLDER_VTT);
  }, []);

  const handleClear = useCallback(() => {
    setEmpreendimento('');
    setArea('');
    setTitulo('');
    setContrato('');
    setAssunto('');
    setLocal('');
    setParticipantes([]);
    setVttContent('');
    setAta(null);
    setError(null);
  }, []);

  const handleSaveToCloud = useCallback(async (ataToSave: AtaData) => {
    try {
      const docId = await saveAtaToFirestore(ataToSave);
      alert(`Ata salva com sucesso na nuvem! ID: ${docId}`);
      // Optionally update the local ata state with the new ID from firestore
      setAta(prevAta => prevAta ? { ...prevAta, id: docId } : null);
    } catch (error) {
      console.error("Erro ao salvar a ata no Firestore:", error);
      alert("Ocorreu um erro ao salvar a ata. Verifique o console para mais detalhes.");
      // Re-throw the error if you want the calling component to handle it as well
      throw error;
    }
  }, []);


  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-200 font-sans">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <InputForm
            companyProfiles={companyProfiles}
            currentCompanyName={currentCompanyName}
            onSettingsSave={handleSettingsSave}
            empreendimento={empreendimento} setEmpreendimento={setEmpreendimento}
            area={area} setArea={setArea}
            titulo={titulo} setTitulo={setTitulo}
            contrato={contrato} setContrato={setContrato}
            assunto={assunto} setAssunto={setAssunto}
            local={local} setLocal={setLocal}
            participantes={participantes} setParticipantes={setParticipantes}
            vttContent={vttContent} setVttContent={setVttContent}
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
              <MinutesDisplay ata={ata} setAta={setAta} onSaveToCloud={handleSaveToCloud} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;