'use client';

import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { 
  Server, Activity, ShieldAlert, Wifi, 
  Search, Bell, Settings, LogOut, LayoutDashboard, 
  Router, RefreshCw, Power, User
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [rebootingId, setRebootingId] = useState<string | null>(null);
  const [selectedWifi, setSelectedWifi] = useState<any | null>(null); // NOVO ESTADO
  const [editingNetwork, setEditingNetwork] = useState<string | null>(null); // Controla qual rede está sendo editada
  const [editSsid, setEditSsid] = useState('');
  const [editPassword, setEditPassword] = useState('');



  // Busca os equipamentos reais no nosso Backend (NestJS -> GenieACS)
  const fetchDevices = async () => {
    try {
      const response = await api.get('/devices');
      setDevices(response.data);
    } catch (err) {
      console.error('Erro ao buscar ONUs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = Cookies.get('acs_token');
    if (!token) {
      router.push('/login');
      return;
    }


    fetchDevices();
  }, [router]);


  // NOVA FUNÇÃO: Dispara a sincronização pesada do TR-069
  const handleRefreshDevice = async (deviceId: string) => {
    setSyncingId(deviceId);
    try {
      await api.post(`/devices/${encodeURIComponent(deviceId)}/refresh`);
      
      // Aguarda 2 segundos para o roteador responder e atualiza a tela
      setTimeout(async () => {
        await fetchDevices();
        setSyncingId(null);
        alert('Equipamento sincronizado com sucesso! Os parâmetros foram atualizados.');
      }, 2000);
      
    } catch (err) {
      console.error('Erro ao sincronizar', err);
      setSyncingId(null);
      alert('O equipamento não respondeu ao comando de sincronização. Verifique se está online.');
    }
  };

  // NOVA FUNÇÃO: Dispara o Reboot Físico
  const handleRebootDevice = async (deviceId: string) => {
    // Confirmação de segurança dupla (para o técnico não clicar sem querer)
    if (!window.confirm('ALERTA: Isso fará o equipamento reiniciar fisicamente, derrubando a conexão do cliente. Deseja prosseguir?')) {
      return;
    }

    setRebootingId(deviceId);
    try {
      await api.post(`/devices/${encodeURIComponent(deviceId)}/reboot`);
      alert('Ordem de reinicialização enviada! O equipamento deve reiniciar em instantes.');
    } catch (err) {
      console.error('Erro ao reiniciar', err);
      alert('Falha ao enviar comando de reboot. Verifique se o equipamento está respondendo.');
    } finally {
      // Tiramos o status de carregamento após 3 segundos
      setTimeout(() => setRebootingId(null), 3000);
    }
  };

  const handleSaveWifi = async (instance: string) => {
    try {
      await api.post(`/devices/${encodeURIComponent(selectedWifi.id)}/wifi`, {
        instance,
        ssid: editSsid,
        password: editPassword
      });
      alert('Nova configuração enviada com sucesso! O roteador aplicará as alterações e pode reiniciar o Wi-Fi em instantes.');
      setEditingNetwork(null);
    } catch (err) {
      console.error('Erro ao atualizar Wi-Fi', err);
      alert('Falha ao enviar a configuração. O equipamento pode estar offline.');
    }
  };

  const handleToggleWifiPower = async (instance: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    const actionText = nextStatus ? 'LIGAR' : 'DESLIGAR';
    
    if (!window.confirm(`Deseja realmente ${actionText} esta frequência de rádio?`)) {
      return;
    }

    try {
      await api.post(`/devices/${encodeURIComponent(selectedWifi.id)}/wifi`, {
        instance,
        enabled: nextStatus
      });
      alert(`Ordem para ${actionText} o rádio enviada! O roteador processará a alteração em instantes.`);
      setSelectedWifi(null); // Fecha o modal para forçar uma nova leitura depois
    } catch (err) {
      console.error('Erro ao alternar energia do Wi-Fi', err);
      alert('Falha ao comunicar o comando de energia. Verifique o status do equipamento.');
    }
  };

  const handleLogout = () => {
    Cookies.remove('acs_token');
    router.push('/login');
  };

  return (
    <div className="flex h-screen bg-nuvyon-dark text-slate-300 font-sans">
      
      {/* Sidebar Lateral */}
      <aside className="w-64 bg-nuvyon-card border-r border-nuvyon-border flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-nuvyon-border">
          <div className="bg-nuvyon-primary/20 p-2 rounded-lg">
            <Server className="w-6 h-6 text-nuvyon-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Nuvyon</h1>
            <p className="text-[10px] text-nuvyon-accent uppercase tracking-widest font-semibold mt-0.5">
              A internet do futuro. Hoje.
            </p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-nuvyon-primary/10 text-nuvyon-primary rounded-xl font-medium transition-colors">
            <LayoutDashboard className="w-5 h-5" />
            Visão Geral
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl font-medium transition-colors">
            <Router className="w-5 h-5" />
            CPEs / ONUs
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl font-medium transition-colors">
            <Activity className="w-5 h-5" />
            Logs de Fibra
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl font-medium transition-colors">
            <Settings className="w-5 h-5" />
            Configurações
          </button>
        </nav>

        <div className="p-4 border-t border-nuvyon-border">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-red-400/10 rounded-xl font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Encerrar Sessão
          </button>
        </div>
      </aside>

      {/* Área Principal */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header Superior */}
        <header className="h-20 bg-nuvyon-card border-b border-nuvyon-border flex items-center justify-between px-8">
          <div className="relative w-96">
            <Search className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar MAC, PPPoE, Serial ou Contrato..." 
              className="w-full bg-nuvyon-dark border border-nuvyon-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-nuvyon-primary focus:ring-1 focus:ring-nuvyon-primary transition-all"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-white relative">
              <Bell className="w-6 h-6" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-nuvyon-card"></span>
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-nuvyon-primary to-nuvyon-accent border-2 border-nuvyon-border flex items-center justify-center text-white font-bold">
              AD
            </div>
          </div>
        </header>

        {/* Conteúdo (Scroll) */}
        <div className="flex-1 overflow-auto p-8">
          
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Centro de Operações de Rede (NOC)</h2>
              <p className="text-slate-400 mt-1 text-sm">Gerenciamento centralizado de equipamentos GPON e Wi-Fi Mesh</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-nuvyon-primary hover:bg-nuvyon-hover text-white rounded-lg font-medium shadow-lg shadow-nuvyon-primary/20 transition-all">
              <RefreshCw className="w-4 h-4" />
              Sincronizar ACS
            </button>
          </div>

          {/* Cards de KPI */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            {[
              { label: 'ONUs Online', value: devices.length || '0', icon: Wifi, color: 'text-green-400', bg: 'bg-green-400/10' },
              { label: 'Atenuação Alta', value: '0', icon: Activity, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
              { label: 'Alarmes Críticos', value: '0', icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-400/10' },
              { label: 'Total Base', value: devices.length || '0', icon: Router, color: 'text-nuvyon-primary', bg: 'bg-nuvyon-primary/10' },
            ].map((stat, i) => (
              <div key={i} className="bg-nuvyon-card border border-nuvyon-border rounded-xl p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-400">{stat.label}</p>
                  <p className="text-3xl font-bold text-white mt-2">{stat.value}</p>
                </div>
                <div className={`p-4 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </div>
            ))}
          </div>

          {/* Tabela de Equipamentos */}
          <div className="bg-nuvyon-card border border-nuvyon-border rounded-xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-nuvyon-border flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Dispositivos Conectados</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-nuvyon-dark text-xs uppercase tracking-wider text-slate-400 border-b border-nuvyon-border">
                    <th className="px-6 py-4 font-medium">Equipamento</th>
                    <th className="px-6 py-4 font-medium">Modelo / Marca</th>
                    <th className="px-6 py-4 font-medium">Endereço IP (WAN)</th>
                    <th className="px-6 py-4 font-medium">Último Contato</th>
                    <th className="px-6 py-4 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nuvyon-border">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-nuvyon-primary" />
                        Buscando telemetria na rede...
                      </td>
                    </tr>
                  ) : devices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Router className="w-12 h-12 text-slate-600 mb-3" />
                          <p className="text-slate-400 font-medium">Nenhum equipamento reportando ao motor.</p>
                          <p className="text-sm text-slate-500 mt-1">Configure a URL do ACS no seu roteador para iniciar.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    devices.map((device, index) => (
                      <tr key={index} className="hover:bg-nuvyon-dark/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-800 rounded-lg">
                              <Wifi className="w-4 h-4 text-nuvyon-primary" />
                            </div>
                            <div>
                              <p className="font-mono text-sm text-nuvyon-accent font-medium">{device.id}</p>
                              <div className="flex gap-1 mt-1">
                                {device.tags?.map((tag: string) => (
                                  <span key={tag} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">{tag}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-white font-medium">{device.model}</p>
                          <p className="text-xs text-slate-500">{device.manufacturer}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium bg-nuvyon-primary/10 text-nuvyon-accent border border-nuvyon-primary/20 w-fit">
                              <Activity className="w-3.5 h-3.5" />
                              {device.ip}
                            </span>
                            <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                              <User className="w-3.5 h-3.5" />
                              {device.pppoe}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">
                          {new Date(device.lastContact).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 flex justify-end gap-2">
                          <button 
                            onClick={() => setSelectedWifi(device)}
                            className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors" 
                            title="Diagnóstico de Wi-Fi"
                          >
                            <Wifi className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleRefreshDevice(device.id)}
                            disabled={syncingId === device.id}
                            className={`p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors ${syncingId === device.id ? 'opacity-50 cursor-not-allowed' : ''}`} 
                            title="Atualizar Parâmetros TR-069">
                            <RefreshCw className={`w-4 h-4 ${syncingId === device.id ? 'animate-spin text-nuvyon-primary' : ''}`} />
                          </button>
                          <button 
                            onClick={() => handleRebootDevice(device.id)}
                            disabled={rebootingId === device.id}
                            className={`p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors ${rebootingId === device.id ? 'opacity-50 cursor-wait' : ''}`} 
                            title="Reboot Remoto"
                          >
                            <Power className={`w-4 h-4 ${rebootingId === device.id ? 'animate-pulse' : ''}`} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
      
      {/* ========================================== */}
      {/* MODAL DE WI-FI (VERSÃO COM CONTROLE DE ENERGIA) */}
      {/* ========================================== */}
      {selectedWifi && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-nuvyon-dark border border-nuvyon-border rounded-xl w-full max-w-2xl p-6 shadow-2xl">
            
            {/* Cabeçalho do Modal */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <Wifi className="w-5 h-5 text-blue-400" />
                Diagnóstico de Wi-Fi Remoto
              </h3>
              <button onClick={() => { setSelectedWifi(null); setEditingNetwork(null); }} className="text-slate-400 hover:text-white text-xl font-bold">
                ✕
              </button>
            </div>
            
            {/* Lista de Rádios */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {Array.isArray(selectedWifi.wifi) ? selectedWifi.wifi.map((net: any, idx: number) => (
                <div key={idx} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                  
                  {/* --- AQUI É A BARRA DE TÍTULO DO RÁDIO (Onde você se perdeu) --- */}
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                        Rede de Rádio {idx + 1}
                      </span>
                      {/* BADGE DE STATUS REAL (Ativo/Desativado) */}
                      <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-bold ${net.enabled ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                        {net.enabled ? '● Ativo' : '○ Desativado'}
                      </span>
                    </div>
                    
                    {/* Botões de Ação do Rádio */}
                    <div className="flex gap-2">
                      {/* Botão de Ligar/Desligar Energia */}
                      {net.instance && (
                        <button
                          onClick={() => handleToggleWifiPower(net.instance, net.enabled)}
                          className={`text-xs px-2 py-1 rounded font-medium transition-colors ${net.enabled ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400' : 'bg-green-500/10 hover:bg-green-500/20 text-green-400'}`}
                        >
                          {net.enabled ? 'Desativar' : 'Ativar'}
                        </button>
                      )}

                      {/* Botão de Editar Senha */}
                      {editingNetwork !== net.instance && net.instance && (
                        <button 
                          onClick={() => {
                            setEditingNetwork(net.instance);
                            setEditSsid(net.ssid);
                            setEditPassword(net.password !== 'Oculta / Não Sincronizada' ? net.password : '');
                          }}
                          className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                        >
                          Editar
                        </button>
                      )}
                    </div>
                  </div>
                  {/* --- FIM DA BARRA DE TÍTULO --- */}

                  {/* Lógica: Mostra o Formulário se clicou em Editar, senão mostra apenas o Texto */}
                  {editingNetwork === net.instance ? (
                    /* MODO EDIÇÃO (FORMULÁRIO) */
                    <div className="space-y-3 mt-3 border-t border-slate-700 pt-3">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Novo Nome da Rede (SSID)</label>
                        <input 
                          type="text" 
                          value={editSsid} 
                          onChange={(e) => setEditSsid(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Nova Senha (Mínimo 8 caracteres)</label>
                        <input 
                          type="text" 
                          value={editPassword} 
                          onChange={(e) => setEditPassword(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-nuvyon-accent focus:outline-none focus:border-blue-500"
                          placeholder="Deixe em branco para não alterar a senha..."
                        />
                      </div>
                      <div className="flex gap-2 justify-end mt-4">
                        <button 
                          onClick={() => setEditingNetwork(null)}
                          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={() => handleSaveWifi(net.instance)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors font-medium"
                        >
                          Salvar Alterações
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* MODO LEITURA (TEXTO) */
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <p className="text-xs text-slate-400 mb-1 uppercase tracking-wider font-semibold">Nome (SSID)</p>
                        <p className="font-medium text-white text-md truncate">{net.ssid}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1 uppercase tracking-wider font-semibold">Senha Atual</p>
                        <p className="font-medium text-nuvyon-accent text-md font-mono truncate">{net.password}</p>
                      </div>
                    </div>
                  )}

                </div>
              )) : (
                <p className="text-slate-400 text-center py-4">Dados de Wi-Fi não disponíveis para este equipamento.</p>
              )}
            </div>

            {/* Rodapé do Modal */}
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => { setSelectedWifi(null); setEditingNetwork(null); }}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}
      {/* ========================================== */}
      {/* FIM DO MODAL DE WI-FI */}
      {/* ========================================== */}
    </div>
  );
}