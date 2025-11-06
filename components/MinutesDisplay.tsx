

import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import type { AtaData, Participant, PautaItem, ResponsavelPrazo } from '../types';
import { FileTextIcon, PlusIcon, TrashIcon, XIcon } from './icons';

const shortenName = (fullName: string): string => {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  return parts.slice(0, 2).join(' ');
};

const COLORS = [
    { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-800 dark:text-blue-200', border: 'border-blue-300 dark:border-blue-700' },
    { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200', border: 'border-green-300 dark:border-green-700' },
    { bg: 'bg-yellow-100 dark:bg-yellow-800', text: 'text-yellow-800 dark:text-yellow-200', border: 'border-yellow-400 dark:border-yellow-700' },
    { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-800 dark:text-purple-200', border: 'border-purple-300 dark:border-purple-700' },
    { bg: 'bg-pink-100 dark:bg-pink-900', text: 'text-pink-800 dark:text-pink-200', border: 'border-pink-300 dark:border-pink-700' },
];

const EditableInput: React.FC<{isEditing: boolean, value: string, onChange: (v:string) => void, className?: string}> = ({ isEditing, value, onChange, className }) => {
    if (!isEditing) return <div className={`font-semibold text-sm h-6 ${className}`}>{value || ''}</div>;
    return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={`font-semibold text-sm h-6 w-full p-1 rounded-md bg-blue-50 dark:bg-slate-700/50 border border-blue-300 dark:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 ${className}`} />;
}

const EditableTextarea: React.FC<{isEditing: boolean, value: string, onChange: (v:string) => void, className?: string}> = ({ isEditing, value, onChange, className }) => {
    if (!isEditing) return <div className={`text-sm ${className}`}>{value}</div>;
    return <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} className={`text-sm w-full p-1 rounded-md bg-blue-50 dark:bg-slate-700/50 border border-blue-300 dark:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y ${className}`} />;
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

// --- Date Conversion Helpers for Prazo field ---
const convertToInputDate = (prazo: string | null): string => {
    if (!prazo) return '';
    const parts = prazo.split('/');
    if (parts.length === 3) {
        const [day, month, year] = parts;
        if (day?.length === 2 && month?.length === 2 && year?.length === 4) {
            return `${year}-${month}-${day}`;
        }
    }
    // Handle cases where the date might already be in 'YYYY-MM-DD' format from the date picker
    if (prazo.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return prazo;
    }
    return '';
};

const convertToDisplayDate = (inputDate: string): string => {
    if (!inputDate) return '';
    const parts = inputDate.split('-');
    if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
    }
    return inputDate;
};

const EditablePautaResponsibles: React.FC<{
  responsaveis: ResponsavelPrazo[];
  participants: Participant[];
  onChange: (newResponsaveis: ResponsavelPrazo[]) => void;
  colorMap: Record<string, typeof COLORS[number]>;
}> = ({ responsaveis, participants, onChange, colorMap }) => {
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const participantNames = participants.map(p => p.nome);
  const currentResponsibleNames = responsaveis.map(r => r.responsavel);
  const availableOptions = participantNames.filter(name => !currentResponsibleNames.includes(name));

  const filteredOptions = inputValue
    ? availableOptions.filter(option =>
        option.toLowerCase().includes(inputValue.toLowerCase())
      )
    : availableOptions;

  const handleAdd = (name: string) => {
    const trimmedName = name.trim();
    if (trimmedName && !currentResponsibleNames.includes(trimmedName)) {
      onChange([...responsaveis, { id: `${Date.now()}-${trimmedName}`, responsavel: trimmedName, prazo: null }]);
    }
    setInputValue('');
    setShowDropdown(false);
  };

  const handleRemove = (idToRemove: string) => {
    onChange(responsaveis.filter(resp => resp.id !== idToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue) {
      e.preventDefault();
      const exactMatch = filteredOptions.find(opt => opt.toLowerCase() === inputValue.toLowerCase());
      handleAdd(exactMatch || inputValue);
    }
  };
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
            setShowDropdown(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [containerRef]);

  return (
    <div className="space-y-2">
        {responsaveis.map((resp, index) => {
            const color = colorMap[resp.responsavel] || COLORS[index % COLORS.length];
            return (
                <div key={resp.id} className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-sm font-semibold truncate ${color.bg} ${color.text}`}>
                    <span title={resp.responsavel}>{shortenName(resp.responsavel)}</span>
                    <button type="button" onClick={() => handleRemove(resp.id)} className="ml-2 -mr-1 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
                        <XIcon className="w-3 h-3" />
                    </button>
                </div>
            );
        })}
      <div className="relative pt-2" ref={containerRef}>
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          className={`w-full p-1 rounded-md bg-blue-50 dark:bg-slate-700/50 border border-blue-300 dark:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500`}
          placeholder="Adicionar responsável..."
        />
        {showDropdown && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-lg max-h-40 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => (
                <div
                  key={option}
                  onClick={() => handleAdd(option)}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  {option}
                </div>
              ))
            ) : (
               <div className="px-3 py-2 text-sm text-slate-500">
                 {inputValue ? `Pressione Enter para adicionar "${inputValue}"` : 'Nenhum participante para adicionar'}
               </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface MinutesDisplayProps {
    ata: AtaData | null;
    setAta: React.Dispatch<React.SetStateAction<AtaData | null>>;
    isEditing: boolean;
    invalidDeadlineFields: Set<string>;
}

const MinutesDisplay: React.FC<MinutesDisplayProps> = ({ ata, setAta, isEditing, invalidDeadlineFields }) => {
    const responsibleColorMap = useMemo(() => {
        if (!ata) return {};
        
        const allResponsibleNames = new Set<string>();
        ata.pauta.forEach(item => {
            item.responsaveis.forEach(resp => {
                allResponsibleNames.add(resp.responsavel);
            });
        });

        const map: Record<string, typeof COLORS[number]> = {};
        Array.from(allResponsibleNames).sort().forEach((name, index) => {
            map[name] = COLORS[index % COLORS.length];
        });

        return map;
    }, [ata]);

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
        const newParticipants = [...ata.participantes, { id: Date.now().toString(), empresa: '', nome: '', email: '', status: 'P' as Participant['status'] }];
        setAta({ ...ata, participantes: newParticipants });
    };

    const removeParticipant = (id: string) => {
        if (!ata) return;
        setAta({ ...ata, participantes: ata.participantes.filter(p => p.id !== id) });
    };

    const handlePautaChange = useCallback((index: number, field: keyof PautaItem, value: any) => {
        if (!ata) return;
        const newPauta = [...ata.pauta];
        (newPauta[index] as any)[field] = value;
        setAta({ ...ata, pauta: newPauta });
    }, [ata, setAta]);
    
    const addPautaItem = () => {
        if (!ata) return;
        const newItemNumber = `${ata.pauta.length + 1}.`;
        const newPauta = [...ata.pauta, { item: newItemNumber, descricao: '', responsaveis: [] }];
        setAta({ ...ata, pauta: newPauta });
    };

    const removePautaItem = (index: number) => {
        if (!ata) return;
        const newPauta = ata.pauta
            .filter((_, i) => i !== index)
            .map((item, i) => ({ ...item, item: `${i + 1}.` }));
        setAta({ ...ata, pauta: newPauta });
    };


    if (!ata) {
        return (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 dark:text-slate-400">
            <FileTextIcon className="w-20 h-20 mb-4 text-slate-300 dark:text-slate-600" />
            <h3 className="text-xl font-semibold">Aguardando Geração da Ata</h3>
            <p className="max-w-md mt-2">Preencha os detalhes da reunião ao lado e clique em "Gerar Ata com IA" para começar.</p>
          </div>
        );
    }
    
    const totalPages = 1; // Placeholder
    const commonInputClass = "p-1 rounded-md bg-blue-50 dark:bg-slate-700/50 border border-blue-300 dark:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500";


    return (
    <div className={`bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-serif p-2 rounded-md ${isEditing ? 'ring-2 ring-blue-500' : ''}`}>
        {isEditing && <div className="text-center text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50 p-2 rounded-t-md mb-2">Modo de Edição Ativado</div>}

        {/* Header */}
        <table className="w-full border-collapse border border-slate-400 dark:border-slate-600 mb-2">
            <tbody>
                <tr>
                    <td rowSpan={3} className="border border-slate-400 dark:border-slate-600 w-1/4 text-center p-2">
                        {ata.logoUrl ? <img src={ata.logoUrl} alt="Company Logo" className="max-h-16 mx-auto"/> : <span className="text-sm text-slate-500">Logo</span>}
                    </td>
                    <td rowSpan={3} className="border border-slate-400 dark:border-slate-600 text-center font-bold text-xl w-1/2">
                        <EditableInput isEditing={isEditing} value={ata.titulo} onChange={(v) => handleAtaChange('titulo', v)} className="text-center font-bold text-xl" />
                    </td>
                    <td className="border border-slate-400 dark:border-slate-600 p-1 text-xs"><div className="font-bold text-slate-500 dark:text-slate-400 uppercase">N°:</div><EditableInput isEditing={isEditing} value={ata.numeroDocumento} onChange={(v) => handleAtaChange('numeroDocumento', v)} /></td>
                    <td className="border border-slate-400 dark:border-slate-600 p-1 text-xs"><div className="font-bold text-slate-500 dark:text-slate-400 uppercase">Rev.</div><EditableInput isEditing={isEditing} value={ata.revisao} onChange={(v) => handleAtaChange('revisao', v)} /></td>
                </tr>
                <tr>
                    <td colSpan={2} className="border border-slate-400 dark:border-slate-600 p-1 text-xs">
                        <div className="font-bold text-slate-500 dark:text-slate-400 uppercase">FOLHA:</div>
                        <div className="font-semibold text-sm h-6">{`1 de ${totalPages}`}</div>
                    </td>
                </tr>
                <tr><td colSpan={2}></td></tr>
                <tr><td className="p-1 text-xs border border-slate-400 dark:border-slate-600" colSpan={3}><div className="font-bold text-slate-500 dark:text-slate-400">EMPREENDIMENTO:</div><EditableInput isEditing={isEditing} value={ata.empreendimento} onChange={(v) => handleAtaChange('empreendimento', v)} /></td><td colSpan={1}></td></tr>
                 <tr><td className="p-1 text-xs border border-slate-400 dark:border-slate-600" colSpan={3}><div className="font-bold text-slate-500 dark:text-slate-400">ÁREA:</div><EditableInput isEditing={isEditing} value={ata.area} onChange={(v) => handleAtaChange('area', v)} /></td><td colSpan={1}></td></tr>
                 <tr><td className="p-1 text-xs border border-slate-400 dark:border-slate-600" colSpan={3}><div className="font-bold text-slate-500 dark:text-slate-400">TÍTULO:</div><EditableInput isEditing={isEditing} value={ata.titulo} onChange={(v) => handleAtaChange('titulo', v)} /></td><td colSpan={1}></td></tr>
                 <tr><td className="p-1 text-xs border border-slate-400 dark:border-slate-600"><div className="font-bold text-slate-500 dark:text-slate-400">CÓPIA CONTROLADA</div></td><td colSpan={3}></td></tr>
            </tbody>
        </table>

        {/* Details */}
        <table className="w-full border-collapse border border-slate-400 dark:border-slate-600 mb-2 text-sm">
            <tbody>
                <tr><td className="p-2 border-r dark:border-slate-600"><strong>Contrato:</strong> <EditableInput isEditing={isEditing} value={ata.contrato} onChange={v => handleAtaChange('contrato', v)} /></td></tr>
                <tr><td className="p-2 border-r dark:border-slate-600"><strong>Assunto:</strong> <EditableInput isEditing={isEditing} value={ata.assunto} onChange={v => handleAtaChange('assunto', v)} /></td></tr>
                 <tr className="border-t dark:border-slate-600">
                    <td className="p-2 border-r dark:border-slate-600"><strong>Local:</strong> <EditableInput isEditing={isEditing} value={ata.local} onChange={v => handleAtaChange('local', v)} /></td>
                    <td className="p-2 border-r dark:border-slate-600"><strong>Horário:</strong> <EditableInput isEditing={isEditing} value={ata.horario} onChange={v => handleAtaChange('horario', v)} /></td>
                    <td className="p-2"><strong>Data:</strong> <EditableInput isEditing={isEditing} value={ata.data} onChange={v => handleAtaChange('data', v)} /></td>
                </tr>
            </tbody>
        </table>

        {/* Participants */}
        <table className="w-full border-collapse border border-slate-400 dark:border-slate-600 mb-2 text-sm">
            <thead>
                <tr className="bg-slate-100 dark:bg-slate-700">
                    <th className="p-2 border dark:border-slate-600 font-bold">Empresa</th>
                    <th className="p-2 border dark:border-slate-600 font-bold">Participantes</th>
                    <th className="p-2 border dark:border-slate-600 font-bold">E-mails</th>
                    <th className="p-2 border dark:border-slate-600 font-bold">P/A</th>
                    <th className="p-2 border dark:border-slate-600 font-bold">Assinatura</th>
                    {isEditing && <th className="p-2 border dark:border-slate-600 font-bold w-10"></th>}
                </tr>
            </thead>
            <tbody>
                {ata.participantes.map((p, index) => (
                    <tr key={p.id}>
                        <td className="p-2 border dark:border-slate-600"><EditableInput isEditing={isEditing} value={p.empresa} onChange={v => handleParticipantChange(index, 'empresa', v)} /></td>
                        <td className="p-2 border dark:border-slate-600"><EditableInput isEditing={isEditing} value={p.nome} onChange={v => handleParticipantChange(index, 'nome', v)} /></td>
                        <td className="p-2 border dark:border-slate-600 text-blue-500"><EditableInput isEditing={isEditing} value={p.email} onChange={v => handleParticipantChange(index, 'email', v)} /></td>
                        <td className="p-2 border dark:border-slate-600 text-center">
                            {isEditing ? (
                                <select value={p.status} onChange={(e) => handleParticipantChange(index, 'status', e.target.value)} className={`w-full ${commonInputClass}`}>
                                    <option value="P">P</option><option value="A">A</option><option value="PA">PA</option><option value="AJ">AJ</option>
                                </select>
                            ) : ( p.status )}
                        </td>
                        <td className="p-2 border dark:border-slate-600"></td>
                        {isEditing && <td className="p-2 border dark:border-slate-600 text-center"><button onClick={() => removeParticipant(p.id)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4" /></button></td>}
                    </tr>
                ))}
            </tbody>
            <tfoot>
                <tr className="bg-slate-100 dark:bg-slate-700"><td colSpan={isEditing ? 6: 5} className="p-2 text-xs"><strong>P</strong>=Presença <strong>PA</strong>=Presença com atraso <strong>A</strong>=Ausência <strong>AJ</strong>=Ausência Justificada</td></tr>
            </tfoot>
        </table>
        {isEditing && <button onClick={addParticipant} className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"><PlusIcon className="w-4 h-4 mr-1"/>Adicionar Participante</button>}
        
        <div className="border border-slate-400 dark:border-slate-600"><div className="text-center font-bold p-2 bg-slate-100 dark:bg-slate-700 border-b border-slate-400 dark:border-slate-600">OBSERVAÇÕES</div><div className="p-2"><EditableTextarea isEditing={isEditing} value={ata.observacoes} onChange={v => handleAtaChange('observacoes', v)} /></div></div>
        
        <table className="w-full border-collapse border border-slate-400 dark:border-slate-600 my-2 text-sm">
             <thead>
                <tr className="bg-slate-100 dark:bg-slate-700">
                    <th className="p-2 border dark:border-slate-600 font-bold w-16">Item</th>
                    <th className="p-2 border dark:border-slate-600 font-bold">Descrição</th>
                    <th className="p-2 border dark:border-slate-600 font-bold w-1/3">Responsável(eis)</th>
                    <th className="p-2 border dark:border-slate-600 font-bold w-1/4">Prazo</th>
                    {isEditing && <th className="p-2 border dark:border-slate-600 font-bold w-10"></th>}
                </tr>
            </thead>
            <tbody>
                {ata.pauta.map((item, index) => (
                    <tr key={index}>
                        <td className="p-2 border dark:border-slate-600 text-center"><EditableInput isEditing={isEditing} value={item.item} onChange={v => handlePautaChange(index, 'item', v)} className="text-center font-semibold" /></td>
                        <td className="p-2 border dark:border-slate-600">{isEditing ? <EditableTextarea isEditing={isEditing} value={item.descricao} onChange={v => handlePautaChange(index, 'descricao', v)} /> : <PautaDescription text={item.descricao} />}</td>
                        
                        {isEditing ? (
                            <>
                                <td className="p-2 border dark:border-slate-600 align-top">
                                    <EditablePautaResponsibles 
                                        responsaveis={item.responsaveis}
                                        participants={ata.participantes}
                                        onChange={v => handlePautaChange(index, 'responsaveis', v)}
                                        colorMap={responsibleColorMap}
                                    />
                                </td>
                                <td className="p-2 border dark:border-slate-600 align-top">
                                    <div className="space-y-2">
                                        {item.responsaveis.map((resp, respIndex) => {
                                            const color = responsibleColorMap[resp.responsavel] || COLORS[respIndex % COLORS.length];
                                            const handlePrazoChangeForThis = (newPrazo: string | null) => {
                                                const newResponsaveis = item.responsaveis.map(r => r.id === resp.id ? { ...r, prazo: newPrazo } : r);
                                                handlePautaChange(index, 'responsaveis', newResponsaveis);
                                            };
                                            const fieldKey = `${index}-${resp.id}`;
                                            const isInvalid = invalidDeadlineFields.has(fieldKey);

                                            return (
                                                <input
                                                    key={resp.id}
                                                    type="date"
                                                    value={convertToInputDate(resp.prazo)}
                                                    onChange={e => handlePrazoChangeForThis(convertToDisplayDate(e.target.value))}
                                                    className={`p-1 rounded-md border text-sm w-full h-[38px] ${color.bg} ${color.text} ${isInvalid ? 'border-red-500 ring-2 ring-red-500/50' : color.border} focus:outline-none focus:ring-1 focus:ring-blue-500`}
                                                />
                                            );
                                        })}
                                    </div>
                                </td>
                            </>
                        ) : (
                            <>
                                <td className="p-2 border dark:border-slate-600 align-top">
                                    <div className="space-y-1">
                                        {item.responsaveis.map((resp, respIndex) => {
                                            const color = responsibleColorMap[resp.responsavel] || COLORS[respIndex % COLORS.length];
                                            return (
                                                <div key={resp.id} title={resp.responsavel} className={`flex items-center justify-center h-[30px] px-2.5 py-1 rounded-md text-sm font-semibold truncate ${color.bg} ${color.text}`}>
                                                    {shortenName(resp.responsavel)}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </td>
                                <td className="p-2 border dark:border-slate-600 align-top">
                                    <div className="space-y-1">
                                        {item.responsaveis.map((resp, respIndex) => {
                                            const color = responsibleColorMap[resp.responsavel] || COLORS[respIndex % COLORS.length];
                                            return (
                                                <div key={resp.id} className={`flex items-center justify-center h-[30px] px-2.5 py-1 rounded-md text-sm font-semibold truncate ${color.bg} ${color.text}`}>
                                                    {resp.prazo || 'N/A'}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </td>
                            </>
                        )}
                        
                        {isEditing && <td className="p-2 border dark:border-slate-600 text-center align-middle"><button onClick={() => removePautaItem(index)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4" /></button></td>}
                    </tr>
                ))}
            </tbody>
        </table>
         {isEditing && <button onClick={addPautaItem} className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline"><PlusIcon className="w-4 h-4 mr-1"/>Adicionar Item na Pauta</button>}

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-4 border-t border-slate-400 dark:border-slate-600 mt-4">
            <EditableInput isEditing={isEditing} value={ata.informacaoPropriedade} onChange={v => handleAtaChange('informacaoPropriedade', v)} className="text-center text-xs" />
        </div>
    </div>
  );
};

export default MinutesDisplay;