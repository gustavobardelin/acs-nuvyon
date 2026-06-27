import { Injectable, Logger } from '@nestjs/common';
import { GenieACSService } from '../genieacs/genieacs.service';

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(private readonly genieacsService: GenieACSService) {}

  async findAll(query?: string) {
    const defaultQuery = query || '{}';
    try {
      const rawDevices = await this.genieacsService.getDevices(defaultQuery);
      
      return rawDevices.map(device => {
        // Correção de Marca e Modelo baseada no objeto _deviceId
        const manufacturer = device._deviceId?._Manufacturer || device._deviceId?._OUI || 'Desconhecido';
        const model = device._deviceId?._ProductClass || 'Roteador Padrão';
        const mac = device.VirtualParameters?.MAC?._value || device._id;

        // --- SNIPER HÍBRIDO DE REDE (SUPORTA TR-098 E TR-181) ---
        const getWanIp = (dev: any): string => {
          if (dev?.VirtualParameters?.IP?._value) return String(dev.VirtualParameters.IP._value);

          // 1. Tentativa via Padrão TR-098 (InternetGatewayDevice)
          const wans098 = dev?.InternetGatewayDevice?.WANDevice?.['1']?.WANConnectionDevice;
          if (wans098) {
            for (const cDev in wans098) {
              if (cDev.startsWith('_')) continue;
              const ppp = wans098[cDev]?.WANPPPConnection;
              if (ppp) {
                for (const inst in ppp) {
                  if (inst.startsWith('_')) continue;
                  const ip = ppp[inst]?.ExternalIPAddress?._value;
                  if (ip && ip !== '0.0.0.0' && ip !== '') return String(ip);
                }
              }
              const ipConn = wans098[cDev]?.WANIPConnection;
              if (ipConn) {
                for (const inst in ipConn) {
                  if (inst.startsWith('_')) continue;
                  const ip = ipConn[inst]?.ExternalIPAddress?._value;
                  if (ip && ip !== '0.0.0.0' && ip !== '') return String(ip);
                }
              }
            }
          }

          // 2. Tentativa via Padrão TR-181 (Device) - Conexões PPPoE
          const pppInterfaces = dev?.Device?.PPP?.Interface;
          if (pppInterfaces) {
            for (const inst in pppInterfaces) {
              if (inst.startsWith('_')) continue;
              const ip = pppInterfaces[inst]?.ExternalIPAddress?._value;
              if (ip && ip !== '0.0.0.0' && ip !== '') return String(ip);
            }
          }

          // 3. Tentativa via Padrão TR-181 (Device) - Conexões DHCP / IPoE
          const ipInterfaces = dev?.Device?.IP?.Interface;
          if (ipInterfaces) {
            for (const inst in ipInterfaces) {
              if (inst.startsWith('_')) continue;
              const ipv4Addresses = ipInterfaces[inst]?.IPv4Address;
              if (ipv4Addresses) {
                for (const addrInst in ipv4Addresses) {
                  if (addrInst.startsWith('_')) continue;
                  const ip = ipv4Addresses[addrInst]?.IPAddress?._value;
                  // Ignora IPs locais de LAN conhecidos para não capturar o Gateway por engano
                  if (ip && ip !== '0.0.0.0' && !ip.startsWith('192.168.') && !ip.startsWith('10.0.0.')) {
                    return String(ip);
                  }
                }
              }
            }
          }

          return 'Aguardando WAN';
        };

        const getPppoeUser = (dev: any): string => {
          // 1. Tentativa via Padrão TR-098
          const wans098 = dev?.InternetGatewayDevice?.WANDevice?.['1']?.WANConnectionDevice;
          if (wans098) {
            for (const cDev in wans098) {
              if (cDev.startsWith('_')) continue;
              const ppp = wans098[cDev]?.WANPPPConnection;
              if (ppp) {
                for (const inst in ppp) {
                  if (inst.startsWith('_')) continue;
                  const user = ppp[inst]?.Username?._value;
                  if (user) return String(user);
                }
              }
            }
          }

          // 2. Tentativa via Padrão TR-181
          const pppInterfaces = dev?.Device?.PPP?.Interface;
          if (pppInterfaces) {
            for (const inst in pppInterfaces) {
              if (inst.startsWith('_')) continue;
              const user = pppInterfaces[inst]?.Username?._value;
              if (user) return String(user);
            }
          }

          return 'Dinâmico / IPoE';
        };

        const ip = getWanIp(device);
        const pppoe = getPppoeUser(device);

       // --- SNIPER DE WI-FI COM LEITURA DE STATUS ATIVO/INATIVO ---
        const getWifiInfo = (dev: any) => {
          const networks: { instance?: string; ssid: string; password: string; enabled: boolean }[] = [];

          // 1. Busca no Padrão TR-098
          const wlan098 = dev?.InternetGatewayDevice?.LANDevice?.['1']?.WLANConfiguration;
          if (wlan098) {
            for (const inst in wlan098) {
              if (inst.startsWith('_')) continue;
              const ssid = wlan098[inst]?.SSID?._value;
              if (ssid) {
                const password = wlan098[inst]?.KeyPassphrase?._value 
                              || wlan098[inst]?.PreSharedKey?.['1']?.PreSharedKey?._value 
                              || 'Oculta / Não Sincronizada';
                const enabled = wlan098[inst]?.Enable?._value === true || wlan098[inst]?.Enable?._value === 'true';
                
                networks.push({ 
                  instance: inst, 
                  ssid: String(ssid), 
                  password: String(password),
                  enabled 
                });
              }
            }
          }

          // 2. Busca no Padrão TR-181 (O seu TP-Link)
          const ssids181 = dev?.Device?.WiFi?.SSID;
          const aps181 = dev?.Device?.WiFi?.AccessPoint;
          
          if (ssids181 && aps181) {
            for (const inst in aps181) {
              if (inst.startsWith('_')) continue;
              
              const security = aps181[inst]?.Security;
              const pass = security?.KeyPassphrase?._value 
                        || security?.PreSharedKey?._value 
                        || security?.X_TP_PreSharedKey?._value 
                        || 'Oculta / Não Sincronizada';
              
              const ssidName = ssids181[inst]?.SSID?._value;
              // Captura o interruptor lógico da antena
              const enabled = ssids181[inst]?.Enable?._value === true || ssids181[inst]?.Enable?._value === 'true';
              
              if (ssidName) {
                networks.push({
                  instance: inst,
                  ssid: String(ssidName),
                  password: String(pass),
                  enabled
                });
              }
            }
          }

          if (networks.length === 0) {
            networks.push({ ssid: 'Nenhum Wi-Fi Ativo', password: '-', enabled: false });
          }

          return networks;
        };

        const wifi = getWifiInfo(device);

        // Atualize o bloco de retorno para enviar os dados do Wi-Fi para o Frontend
        return {
          id: device._id,
          mac,
          manufacturer,
          model,
          ip,
          pppoe,
          wifi, // <--- ADICIONE ESTA LINHA AQUI
          lastContact: device._lastContact || device._lastBoot,
          tags: device._tags || []
        };
      });
    } catch (error) {
      this.logger.error('Falha ao processar dispositivos', error);
      throw error;
    }
  }

  async reboot(deviceId: string) {
    // Repassa a ordem para o serviço especialista em comunicação
    return this.genieacsService.rebootDevice(deviceId);
  }

  async refresh(deviceId: string, objectName: string = '') {
    return this.genieacsService.refreshObject(deviceId, objectName);
  }

  async updateWifi(deviceId: string, instance: string, newSsid?: string, newPassword?: string, enabled?: boolean) {
    const parameters: [string, any, string][] = [];
    
    if (newSsid) {
      parameters.push([`Device.WiFi.SSID.${instance}.SSID`, newSsid, 'xsd:string']);
    }
    if (newPassword) {
      parameters.push([`Device.WiFi.AccessPoint.${instance}.Security.KeyPassphrase`, newPassword, 'xsd:string']);
    }
    // Adiciona o comando booleano de energia se ele for enviado
    if (enabled !== undefined) {
      parameters.push([`Device.WiFi.SSID.${instance}.Enable`, enabled, 'xsd:boolean']);
    }

    if (parameters.length > 0) {
      return this.genieacsService.setParameterValues(deviceId, parameters);
    }
    
    return { message: 'Nenhum dado enviado para alteração.' };
  }
}