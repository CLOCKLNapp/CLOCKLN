# CLOCKLN - Resumo da Sessão Atual
**Data:** 18-19/02/2026

---

## Mudanças Realizadas

### Planos de Preços (em EURO)

| Plano | Preço Mensal | Funcionários |
|-------|--------------|--------------|
| **Trial** | Grátis (30 dias) | 5 |
| **Pro** | €29,90 | 50 |
| **Plus** | €59,90 | 150 |
| **Business** | €99,90 | 500 |
| **Intelligent Edition** | €299,90 | Ilimitados |

### NOVO: Intelligent Edition Features
- **CLOCKLN AI - HR Operator**: Comandos de RH por linguagem natural
  - Add/remove vacation
  - Approve overtime
  - Correct time entry
  - Send notifications
- **Compliance Monitor (Germany Mode)**: 
  - Weekly 48h limit (ArbZG §3)
  - Overtime accumulation alerts
  - Vacation grant monitoring (12 months)
  - Missing records detection
- **Immutable Audit System**: Log completo de todas ações AI
- **Permission Structure**: HR full access, Managers limited, Employees blocked

### Descontos por Período
- **Anual:** +1 mês grátis
- **3 Anos:** +5 meses grátis
- **5 Anos:** +1 ano grátis (BEST VALUE)

### Moedas Disponíveis
- EUR (Euro) - Padrão
- USD (Dólar)

---

## Regras de Negócio do Trial

1. **Trial único por empresa** - Cada empresa só pode usar 1 vez
2. **Após 30 dias** - Acesso bloqueado, obrigatório escolher plano pago
3. **Se cancelar** - Não pode fazer novo trial nunca mais
4. **Cadastro** - Deve ser vinculado ao método de pagamento (Stripe)

---

## Arquivos Modificados/Criados

- `/app/frontend/src/pages/LandingPage.js` - Novos planos e seção Intelligent
- `/app/frontend/src/pages/IntelligentControlCenter.js` - **NOVO** Control Center
- `/app/frontend/src/App.js` - Rota /intelligent
- `/app/frontend/src/pages/HRDashboard.js` - Botão Intelligent
- `/app/backend/server.py` - Endpoints AI, Compliance, Audit

---

## Novos Endpoints API (Intelligent Edition)

- `POST /api/ai/command` - Criar comando AI
- `POST /api/ai/confirm` - Confirmar e executar comando
- `GET /api/ai/commands` - Listar comandos recentes
- `GET /api/compliance/check` - Rodar verificação compliance
- `GET /api/compliance/alerts` - Listar alertas
- `PATCH /api/compliance/alerts/{id}/acknowledge` - Reconhecer alerta
- `GET /api/audit/logs` - Ver logs de auditoria
- `GET /api/intelligent/dashboard` - Dashboard do Control Center

---

## Links Importantes

- **Produção:** https://clockln-app.vercel.app
- **Preview:** https://clockln-plans.preview.emergentagent.com
- **GitHub:** https://github.com/CLOCKLNapp/CLOCKLN
- **Backend:** https://clockln-production.up.railway.app

---

## Credenciais Admin
- **Email:** michaelcaceres71@gmail.com
- **Senha:** 123456

---

## Próximas Tarefas Pendentes
- [ ] Implementar lógica de bloqueio após 30 dias de trial
- [ ] Impedir empresa de fazer novo trial após cancelar
- [ ] Vincular cadastro ao método de pagamento Stripe
- [ ] Configurar Stripe para pagamentos reais
- [ ] Integrar NLP real para comandos AI (OpenAI GPT)
- [ ] Adicionar voice input para comandos
- [ ] Mobile execution
- [ ] Predictive analytics avançado

---

## Observações
- Projeto está em fase de TESTE com Stripe
- Localização: Alemanha (preços em EUR)
- Deploy feito via GitHub → Vercel (automático)
- Intelligent Edition requer subscription_plan = 'intelligent' na empresa
