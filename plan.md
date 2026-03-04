# Plano: Horários Discretos por Quadra (Sábado/Domingo)

## Contexto
O sistema atual gera slots de 1h entre `openTime` e `closeTime` da quadra. Precisamos trocar para **slots discretos** específicos por quadra, diferentes para Sábado e Domingo.

## Horários calculados (startTime → endTime)

### Sábado (dayOfWeek = 6)
**Tennis Center:** 08:00-09:30, 09:30-11:00, 11:00-12:30, 12:30-14:00, 14:00-15:30, 15:30-17:00
**Tennis Point:** 08:00-09:00, 09:00-10:00, 10:00-11:30, 11:30-13:00, 13:00-14:30, 14:30-16:00, 16:00-17:30, 17:30-19:00
**Top Spin Q1:** 07:30-09:00, 09:00-10:30, 10:30-12:00, 16:00-17:30, 17:30-19:00
**Top Spin Q2:** 07:30-09:00, 09:00-10:30, 10:30-12:00, 16:00-17:30, 17:30-19:00

### Domingo (dayOfWeek = 0)
**Tennis Center:** 08:30-10:00, 10:00-11:30
**Tennis Point:** 10:00-11:30, 11:30-13:00, 13:00-14:30, 14:30-16:00, 16:00-17:30, 17:30-19:00
**Top Spin Q1:** 08:00-09:30, 09:30-11:00, 11:00-12:30
**Top Spin Q2:** 08:00-09:30, 09:30-11:00, 11:00-12:30

---

## Passos de Implementação

### 1. Novo modelo Prisma `CourtSlot`
- Campos: `id`, `courtId`, `dayOfWeek` (0=Dom, 6=Sab), `startTime`, `endTime`
- Relação com Court
- Index em `[courtId, dayOfWeek]`
- Manter `openTime`/`closeTime` no Court (informacional)

### 2. Inserir dados via script SQL direto
- Inserir todos os CourtSlots para as 4 quadras × 2 dias
- Usar os IDs de quadra existentes no banco

### 3. Atualizar `availability/route.ts`
- Substituir `generateTimeSlots()` por query ao `CourtSlot` usando `courtId` + `dayOfWeek` extraído da data
- Retornar `endTime` em cada TimeSlot (novo campo na interface)
- Mudar lógica de bloqueio/ocupação de "hora a hora" para **overlap de ranges**

### 4. Atualizar `bookings/route.ts` (criação)
- Validar que `startTime`+`endTime` correspondem a um `CourtSlot` válido para o `courtId` e `dayOfWeek`
- Remover validação antiga baseada em `openTime`/`closeTime` por hora

### 5. Atualizar `admin/blocks/route.ts`
- Validar bloqueios contra os CourtSlots do dia, não contra `openTime`/`closeTime`

### 6. Atualizar Frontend (`page.tsx`)
- **Interface TimeSlot**: adicionar campo `endTime`
- **Reservar tab**: mostrar `slot.time - slot.endTime` nos botões, usar `slot.endTime` na reserva (em vez de `startHour + 1`)
- **Confirmação**: mostrar horário real do slot
- **Bloqueios dialog**: mostrar os horários reais dos CourtSlots como opções (startTimes para início, endTimes para fim)
- **Reservas do Dia**: já agrupa por `startTime-endTime`, funciona sem mudanças

### 7. Atualizar `seed.ts`
- Incluir criação dos CourtSlots no seed
- Atualizar sample bookings para usar horários reais das quadras
