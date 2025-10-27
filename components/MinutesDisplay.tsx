

import React, { useState, useCallback, useEffect } from 'react';
import type { AtaData, Participant, PautaItem } from '../types';
import { exportToDocx, exportToPdf } from '../services/exportService';
import { CheckIcon, ClipboardIcon, FileTextIcon, DownloadIcon, EditIcon, PlusIcon, TrashIcon } from './icons';

interface MinutesDisplayProps {
  ata: AtaData | null;
  setAta: (ata: AtaData | null) => void;
}

const EditableInput: React.FC<{isEditing: boolean, value: string, onChange: (v:string) => void, className?: string}> = ({ isEditing, value, onChange, className }) => {
    if (!isEditing) return <div className={`font-semibold text-sm h-6 ${className}`}>{value || ''}</div>;
    return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={`font-semibold text-sm h-6 w-full p-1 rounded-md bg-blue-50 dark:bg-gray-700/50 border border-blue-300 dark:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 ${className}`} />;
}

const EditableTextarea: React.FC<{isEditing: boolean, value: string, onChange: (v:string) => void, className?: string}> = ({ isEditing, value, onChange, className }) => {
    if (!isEditing) return <div className={`text-sm ${className}`}>{value}</div>;
    return <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} className={`text-sm w-full p-1 rounded-md bg-blue-50 dark:bg-gray-700/50 border border-blue-300 dark:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y ${className}`} />;
}

const PautaDescription: React.FC<{ text: string }> = ({ text }) => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    return (
        <div>
            {lines.map((line, index) => {
                const isListItem = /^\s*[-*o]\s/.test(line);
                const lineContent = line.replace(/^\s*[-*o]\s/, '');
                if (isListItem) {
                    return <div key={index} className="ml-4 flex"><span className="mr-2">&bull;</span><span>{lineContent}</span></div>;
                }
                return <p key={index} className="mb-1">{line}</p>;
            })}
        </div>
    );
};

const MinutesDisplay: React.FC<MinutesDisplayProps> = ({ ata, setAta }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isExportReady, setIsExportReady] = useState(false);

    useEffect(() => {
        const checkLibs = () => {
            const fsReady = !!(window as any).saveAs;
            const pdfReady = typeof (window as any).jspdf?.jsPDF?.API?.autoTable === 'function';
            const allReady = fsReady && pdfReady;
            if (allReady) setIsExportReady(true);
            return allReady;
        };
        if (checkLibs()) return;
        const interval = setInterval(() => { if (checkLibs()) clearInterval(interval); }, 200);
        return () => clearInterval(interval);
    }, []);

    const generatePlainText = useCallback(() => {
        if (!ata) return '';
        return JSON.stringify(ata, null, 2);
    }, [ata]);


    const handleCopy = useCallback(() => {
        if (!ata) return;
        navigator.clipboard.writeText(generatePlainText());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [generatePlainText, ata]);
    
    // --- Edit Handlers ---
    const handleAtaChange = useCallback(<K extends keyof AtaData>(field: K, value: AtaData[K]) => {
        if (!ata) return;
        setAta({ ...ata, [field]: value });
    }, [ata, setAta]);

    const handleParticipantChange = useCallback((index: number, field: keyof Participant, value: string) => {
        if (!ata) return;
        const newParticipants = ata.participantes.map((p, i) => {
            if (i !== index) {
                return p;
            }
            const updatedParticipant = { ...p };
            if (field === 'status') {
                // The value from a select input is a string, so we cast it to the specific
                // union type required for the 'status' property.
                updatedParticipant.status = value as Participant['status'];
            } else {
                (updatedParticipant as any)[field] = value;
            }
            return updatedParticipant;
        });
        setAta({ ...ata, participantes: newParticipants });
    }, [ata, setAta]);
    
    const addParticipant = () => {
        if (!ata) return;
        // Fix: Explicitly cast status to the specific union type to prevent type widening issues.
        const newParticipants = [...ata.participantes, { id: Date.now().toString(), empresa: '', nome: '', email: '', status: 'P' as Participant['status'] }];
        setAta({ ...ata, participantes: newParticipants });
    };

    const removeParticipant = (id: string) => {
        if (!ata) return;
        setAta({ ...ata, participantes: ata.participantes.filter(p => p.id !== id) });
    };

    const handlePautaChange = useCallback((index: number, field: keyof PautaItem, value: string | string[]) => {
        if (!ata) return;
        const newPauta = [...ata.pauta];
        (newPauta[index] as any)[field] = value;
        setAta({ ...ata, pauta: newPauta });
    }, [ata, setAta]);
    
    const addPautaItem = () => {
        if (!ata) return;
        const newItemNumber = ata.pauta.length > 0 ? `${parseInt(ata.pauta[ata.pauta.length - 1].item.replace('.', '')) + 1}.` : '1.';
        const newPauta = [...ata.pauta, { item: newItemNumber, descricao: '', responsaveis: [], prazo: null }];
        setAta({ ...ata, pauta: newPauta });
    };

    const removePautaItem = (index: number) => {
        if (!ata) return;
        const newPauta = ata.pauta.filter((_, i) => i !== index);
        setAta({ ...ata, pauta: newPauta });
    };


    if (!ata) {
        return (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
            <FileTextIcon className="w-20 h-20 mb-4 text-gray-300 dark:text-gray-600" />
            <h3 className="text-xl font-semibold">Aguardando Geração da Ata</h3>
            <p className="max-w-md mt-2">Preencha os detalhes da reunião ao lado e clique em "Gerar Ata com IA" para começar.</p>
          </div>
        );
    }
    
    const totalPages = 1; // Placeholder
    const commonInputClass = "p-1 rounded-md bg-blue-50 dark:bg-gray-700/50 border border-blue-300 dark:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500";


    return (
    <div className={`bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 relative font-serif p-2 rounded-md ${isEditing ? 'ring-2 ring-blue-500' : ''}`}>
        <div className="absolute top-2 right-2 flex space-x-2 z-10">
            <button onClick={() => setIsEditing(!isEditing)} title={isEditing ? "Salvar Alterações" : "Editar Ata"} className={`p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${isEditing ? 'bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-300 hover:bg-green-200 focus:ring-green-500' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 focus:ring-blue-500'}`}>
                {isEditing ? <CheckIcon className="w-5 h-5" /> : <EditIcon className="w-5 h-5" />}
            </button>
            <button onClick={handleCopy} title="Copiar Dados (JSON)" className="p-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 rounded-md bg-gray-100 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800">
                {copied ? <CheckIcon className="w-5 h-5 text-green-500" /> : <ClipboardIcon className="w-5 h-5" />}
            </button>
            <button onClick={() => exportToDocx(ata)} disabled={!isExportReady} title={isExportReady ? "Exportar para DOCX" : "Aguardando libs..."} className={`p-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 rounded-md bg-gray-100 dark:bg-gray-700 disabled:opacity-50 ${!isExportReady ? 'animate-pulse' : ''}`}>
                <DownloadIcon className="w-5 h-5" />
            </button>
            <button onClick={() => exportToPdf(ata)} disabled={!isExportReady} title={isExportReady ? "Exportar para PDF" : "Aguardando libs..."} className={`p-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 rounded-md bg-gray-100 dark:bg-gray-700 disabled:opacity-50 ${!isExportReady ? 'animate-pulse' : ''}`}>
                <DownloadIcon className="w-5 h-5 text-red-500" />
            </button>
        </div>
        
        {isEditing && <div className="text-center text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50 p-2 rounded-t-md mb-2">Modo de Edição Ativado</div>}

        {/* Header */}
        <table className="w-full border-collapse border border-gray-400 dark:border-gray-600 mb-2">
            <tbody>
                <tr>
                    <td rowSpan={3} className="border border-gray-400 dark:border-gray-600 w-1/4 text-center p-2">
                        {ata.logoUrl ? <img src={ata.logoUrl} alt="Company Logo" className="max-h-16 mx-auto"/> : <span className="text-sm text-gray-500">Logo</span>}
                    </td>
                    <td rowSpan={3} className="border border-gray-400 dark:border-gray-600 text-center font-bold text-xl w-1/2">
                        <EditableInput isEditing={isEditing} value={ata.titulo} onChange={(v) => handleAtaChange('titulo', v)} className="text-center font-bold text-xl" />
                    </td>
                    <td className="border border-gray-400 dark:border-gray-600 p-1 text-xs"><div className="font-bold text-gray-500 dark:text-gray-400 uppercase">N°:</div><EditableInput isEditing={isEditing} value={ata.numeroDocumento} onChange={(v) => handleAtaChange('numeroDocumento', v)} /></td>
                    <td className="border border-gray-400 dark:border-gray-600 p-1 text-xs"><div className="font-bold text-gray-500 dark:text-gray-400 uppercase">Rev.</div><EditableInput isEditing={isEditing} value={ata.revisao} onChange={(v) => handleAtaChange('revisao', v)} /></td>
                </tr>
                <tr>
                    <td colSpan={2} className="border border-gray-400 dark:border-gray-600 p-1 text-xs">
                        <div className="font-bold text-gray-500 dark:text-gray-400 uppercase">FOLHA:</div>
                        <div className="font-semibold text-sm h-6">{`1 de ${totalPages}`}</div>
                    </td>
                </tr>
                <tr><td colSpan={2}></td></tr>
                <tr><td className="p-1 text-xs border border-gray-400 dark:border-gray-600" colSpan={3}><div className="font-bold text-gray-500 dark:text-gray-400">EMPREENDIMENTO:</div><EditableInput isEditing={isEditing} value={ata.empreendimento} onChange={(v) => handleAtaChange('empreendimento', v)} /></td><td colSpan={1}></td></tr>
                 <tr><td className="p-1 text-xs border border-gray-400 dark:border-gray-600" colSpan={3}><div className="font-bold text-gray-500 dark:text-gray-400">ÁREA:</div><EditableInput isEditing={isEditing} value={ata.area} onChange={(v) => handleAtaChange('area', v)} /></td><td colSpan={1}></td></tr>
                 <tr><td className="p-1 text-xs border border-gray-400 dark:border-gray-600" colSpan={3}><div className="font-bold text-gray-500 dark:text-gray-400">TÍTULO:</div><EditableInput isEditing={isEditing} value={ata.titulo} onChange={(v) => handleAtaChange('titulo', v)} /></td><td colSpan={1}></td></tr>
                 <tr><td className="p-1 text-xs border border-gray-400 dark:border-gray-600"><div className="font-bold text-gray-500 dark:text-gray-400">CÓPIA CONTROLADA</div></td><td colSpan={3}></td></tr>
            </tbody>
        </table>

        {/* Details */}
        <table className="w-full border-collapse border border-gray-400 dark:border-gray-600 mb-2 text-sm">
            <tbody>
                <tr><td className="p-2 border-r dark:border-gray-600"><strong>Contrato:</strong> <EditableInput isEditing={isEditing} value={ata.contrato} onChange={v => handleAtaChange('contrato', v)} /></td></tr>
                <tr><td className="p-2 border-r dark:border-gray-600"><strong>Assunto:</strong> <EditableInput isEditing={isEditing} value={ata.assunto} onChange={v => handleAtaChange('assunto', v)} /></td></tr>
                 <tr className="border-t dark:border-gray-600">
                    <td className="p-2 border-r dark:border-gray-600"><strong>Local:</strong> <EditableInput isEditing={isEditing} value={ata.local} onChange={v => handleAtaChange('local', v)} /></td>
                    <td className="p-2 border-r dark:border-gray-600"><strong>Horário:</strong> <EditableInput isEditing={isEditing} value={ata.horario} onChange={v => handleAtaChange('horario', v)} /></td>
                    <td className="p-2"><strong>Data:</strong> <EditableInput isEditing={isEditing} value={ata.data} onChange={v => handleAtaChange('data', v)} /></td>
                </tr>
            </tbody>
        </table>

        {/* Participants */}
        <table className="w-full border-collapse border border-gray-400 dark:border-gray-600 mb-2 text-sm">
            <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                    <th className="p-2 border dark:border-gray-600 font-bold">Empresa</th>
                    <th className="p-2 border dark:border-gray-600 font-bold">Participantes</th>
                    <th className="p-2 border dark:border-gray-600 font-bold">E-mails</th>
                    <th className="p-2 border dark:border-gray-600 font-bold">P/A</th>
                    <th className="p-2 border dark:border-gray-600 font-bold">Assinatura</th>
                    {isEditing && <th className="p-2 border dark:border-gray-600 font-bold w-10"></th>}
                </tr>
            </thead>
            <tbody>
                {ata.participantes.map((p, index) => (
                    <tr key={p.id}>
                        <td className="p-2 border dark:border-gray-600"><EditableInput isEditing={isEditing} value={p.empresa} onChange={v => handleParticipantChange(index, 'empresa', v)} /></td>
                        <td className="p-2 border dark:border-gray-600"><EditableInput isEditing={isEditing} value={p.nome} onChange={v => handleParticipantChange(index, 'nome', v)} /></td>
                        <td className="p-2 border dark:border-gray-600 text-blue-500"><EditableInput isEditing={isEditing} value={p.email} onChange={v => handleParticipantChange(index, 'email', v)} /></td>
                        <td className="p-2 border dark:border-gray-600 text-center">
                            {isEditing ? (
                                <select value={p.status} onChange={(e) => handleParticipantChange(index, 'status', e.target.value)} className={`w-full ${commonInputClass}`}>
                                    <option value="P">P</option><option value="A">A</option><option value="PA">PA</option><option value="AJ">AJ</option>
                                </select>
                            ) : ( p.status )}
                        </td>
                        <td className="p-2 border dark:border-gray-600"></td>
                        {isEditing && <td className="p-2 border dark:border-gray-600 text-center"><button onClick={() => removeParticipant(p.id)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4" /></button></td>}
                    </tr>
                ))}
            </tbody>
            <tfoot>
                <tr className="bg-gray-100 dark:bg-gray-700"><td colSpan={isEditing ? 6: 5} className="p-2 text-xs"><strong>P</strong>=Presença <strong>PA</strong>=Presença com atraso <strong>A</strong>=Ausência <strong>AJ</strong>=Ausência Justificada</td></tr>
            </tfoot>
        </table>
        {isEditing && <button onClick={addParticipant} className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"><PlusIcon className="w-4 h-4 mr-1"/>Adicionar Participante</button>}
        
        <div className="border border-gray-400 dark:border-gray-600"><div className="text-center font-bold p-2 bg-gray-100 dark:bg-gray-700 border-b border-gray-400 dark:border-gray-600">OBSERVAÇÕES</div><div className="p-2"><EditableTextarea isEditing={isEditing} value={ata.observacoes} onChange={v => handleAtaChange('observacoes', v)} /></div></div>
        
        <table className="w-full border-collapse border border-gray-400 dark:border-gray-600 my-2 text-sm">
             <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                    <th className="p-2 border dark:border-gray-600 font-bold w-16">Item</th>
                    <th className="p-2 border dark:border-gray-600 font-bold">Descrição</th>
                    <th className="p-2 border dark:border-gray-600 font-bold w-48">Responsável(eis)</th>
                    <th className="p-2 border dark:border-gray-600 font-bold w-32">Prazo</th>
                    {isEditing && <th className="p-2 border dark:border-gray-600 font-bold w-10"></th>}
                </tr>
            </thead>
            <tbody>
                {ata.pauta.map((item, index) => (
                    <tr key={index}>
                        <td className="p-2 border dark:border-gray-600 text-center"><EditableInput isEditing={isEditing} value={item.item} onChange={v => handlePautaChange(index, 'item', v)} className="text-center font-semibold" /></td>
                        <td className="p-2 border dark:border-gray-600">{isEditing ? <EditableTextarea isEditing={isEditing} value={item.descricao} onChange={v => handlePautaChange(index, 'descricao', v)} /> : <PautaDescription text={item.descricao} />}</td>
                        <td className="p-2 border dark:border-gray-600"><EditableInput isEditing={isEditing} value={item.responsaveis.join(', ')} onChange={v => handlePautaChange(index, 'responsaveis', v.split(',').map(s=>s.trim()))} /></td>
                        <td className="p-2 border dark:border-gray-600"><EditableInput isEditing={isEditing} value={item.prazo || ''} onChange={v => handlePautaChange(index, 'prazo', v)} /></td>
                        {isEditing && <td className="p-2 border dark:border-gray-600 text-center"><button onClick={() => removePautaItem(index)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4" /></button></td>}
                    </tr>
                ))}
            </tbody>
        </table>
         {isEditing && <button onClick={addPautaItem} className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline"><PlusIcon className="w-4 h-4 mr-1"/>Adicionar Item na Pauta</button>}

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-400 dark:border-gray-600 mt-4">
            <EditableInput isEditing={isEditing} value={ata.informacaoPropriedade} onChange={v => handleAtaChange('informacaoPropriedade', v)} className="text-center text-xs" />
        </div>
    </div>
  );
};

export default MinutesDisplay;