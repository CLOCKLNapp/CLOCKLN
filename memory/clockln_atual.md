# CLOCKLN - Resumo da Sessão Atual
**Data:** 18/02/2026

---

## Mudanças Realizadas

### Novos Planos de Preços (em EURO)

| Plano | Preço Mensal | Funcionários |
|-------|--------------|--------------|
| **Trial** | Grátis (30 dias) | 5 |
| **Pro** | €29,90 | 50 |
| **Plus** | €59,90 | 150 |
| **Business** | €99,90 | 500 |

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

## Arquivos Modificados

- `/app/frontend/src/pages/LandingPage.js` - Novos planos e preços

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
- [ ] Configurar webhooks do Stripe

---

## Observações
- Projeto está em fase de TESTE com Stripe
- Localização: Alemanha (preços em EUR)
- Deploy feito via GitHub → Vercel (automático)
