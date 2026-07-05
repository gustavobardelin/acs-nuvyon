import { DeviceAlert } from '@/types/device-alerts';

export interface RemediationStep {
  title: string;
  description: string;
  risk: 'low' | 'medium' | 'high';
  recommended: boolean;
}

export interface RemediationPlaybook {
  title: string;
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
  canAutoFix: boolean;
  steps: RemediationStep[];
  warnings: string[];
}

export function getRemediationPlaybook(alert: DeviceAlert): RemediationPlaybook {
  if (alert.category === 'ip') {
    return {
      title: 'Playbook: IP WAN inválido ou ausente',
      summary:
        'Esse alerta pode indicar falha de WAN/PPPoE, CPE em bridge/AP, equipamento em laboratório ou parâmetro WAN não sincronizado.',
      riskLevel: alert.device.status === 'online' ? 'low' : 'medium',
      canAutoFix: false,
      steps: [
        {
          title: 'Verificar cenário do equipamento',
          description:
            'Confirme se o CPE está em produção, bancada, modo AP, DHCP atrás de outro roteador ou bridge.',
          risk: 'low',
          recommended: true,
        },
        {
          title: 'Atualizar parâmetros WAN',
          description:
            'Execute refresh dos objetos WAN antes de concluir que existe falha real.',
          risk: 'low',
          recommended: true,
        },
        {
          title: 'Checar status do inform',
          description:
            'Se o CPE está online e informando, o alerta pode ser apenas cenário esperado.',
          risk: 'low',
          recommended: true,
        },
        {
          title: 'Silenciar se for laboratório/AP',
          description:
            'Se for caso esperado, silenciar o alerta com motivo evita falso positivo no NOC.',
          risk: 'low',
          recommended: true,
        },
      ],
      warnings: [
        'Não alterar VLAN WAN automaticamente.',
        'Não reiniciar o CPE só por ausência de IP WAN.',
        'Não aplicar template WAN sem confirmar o cenário do cliente.',
      ],
    };
  }

  if (alert.category === 'connectivity') {
    return {
      title: 'Playbook: CPE offline',
      summary:
        'O CPE está sem contato dentro do limite operacional. Pode ser cliente desligado, queda de energia, perda de internet, falha PPPoE, problema óptico ou CPE travado.',
      riskLevel: 'high',
      canAutoFix: false,
      steps: [
        {
          title: 'Verificar último inform',
          description:
            'Veja há quanto tempo o CPE parou de informar ao ACS.',
          risk: 'low',
          recommended: true,
        },
        {
          title: 'Testar Connection Request',
          description:
            'Se houver CR disponível, teste o alcance antes de qualquer ação.',
          risk: 'low',
          recommended: true,
        },
        {
          title: 'Conferir sinal/ONU no sistema do provedor',
          description:
            'Se a ONU estiver online e o roteador offline, o problema pode estar no roteador ou WAN.',
          risk: 'medium',
          recommended: true,
        },
        {
          title: 'Aguardar próximo inform ou agendar refresh',
          description:
            'Se o CPE voltar a informar, execute refresh geral para atualizar o estado.',
          risk: 'low',
          recommended: true,
        },
      ],
      warnings: [
        'Não assumir defeito físico sem verificar ONU/sinal.',
        'Não aplicar template em CPE offline esperando efeito imediato.',
      ],
    };
  }

  if (alert.category === 'inform') {
    return {
      title: 'Playbook: Inform atrasado',
      summary:
        'O CPE ainda pode estar online, mas o intervalo de inform está fora do ideal.',
      riskLevel: alert.severity === 'critical' ? 'high' : 'medium',
      canAutoFix: false,
      steps: [
        {
          title: 'Conferir Periodic Inform',
          description:
            'Verifique se o PeriodicInformEnable está ativo e se o intervalo está adequado.',
          risk: 'low',
          recommended: true,
        },
        {
          title: 'Aplicar template TR-069 operacional',
          description:
            'Em modelo conhecido, aplique template que ajusta inform para 300 segundos.',
          risk: 'medium',
          recommended: true,
        },
        {
          title: 'Testar Connection Request',
          description:
            'Se CR responder, o CPE está alcançável mesmo com inform atrasado.',
          risk: 'low',
          recommended: true,
        },
      ],
      warnings: [
        'Não classificar como offline se ainda houver inform recente.',
        'Evite reboot sem necessidade.',
      ],
    };
  }

  if (alert.category === 'identity') {
    return {
      title: 'Playbook: Identificação incompleta',
      summary:
        'O CPE não informou corretamente modelo, serial ou product class. Isso prejudica templates e grupos automáticos.',
      riskLevel: 'medium',
      canAutoFix: false,
      steps: [
        {
          title: 'Executar refresh de DeviceInfo',
          description:
            'Atualize Device.DeviceInfo ou InternetGatewayDevice.DeviceInfo.',
          risk: 'low',
          recommended: true,
        },
        {
          title: 'Verificar compatibilidade TR-069',
          description:
            'Alguns firmwares expõem poucos parâmetros ou nomes diferentes.',
          risk: 'low',
          recommended: true,
        },
        {
          title: 'Criar regra por modelo/fabricante',
          description:
            'Se o modelo sempre vem incompleto, crie tratamento específico no normalizador.',
          risk: 'medium',
          recommended: true,
        },
      ],
      warnings: [
        'Não aplicar template específico se o modelo não foi identificado.',
      ],
    };
  }

  return {
    title: 'Playbook: Diagnóstico geral',
    summary:
      'Alerta genérico. Analise status, último inform, IP WAN, histórico de ações e capabilities do CPE.',
    riskLevel: alert.severity === 'critical' ? 'high' : 'medium',
    canAutoFix: false,
    steps: [
      {
        title: 'Abrir página do CPE',
        description:
          'Confira Health Score, Connection Request, parâmetros importantes e histórico.',
        risk: 'low',
        recommended: true,
      },
      {
        title: 'Verificar histórico recente',
        description:
          'Veja se houve template, reboot, refresh ou falha de comando recentemente.',
        risk: 'low',
        recommended: true,
      },
      {
        title: 'Classificar o alerta',
        description:
          'Reconheça, silencie ou resolva conforme o cenário operacional.',
        risk: 'low',
        recommended: true,
      },
    ],
    warnings: ['Não automatizar correções sem confirmar o impacto.'],
  };
}
