# Puzzalarm

Despertador que só desliga quando você resolve um puzzle no estilo **The Witness**: desenhe uma linha do círculo até o arco de saída.

## Mecânicas (cada uma independente, como no jogo)

| Painel    | Cor   | Regra                                                                 |
| --------- | ----- | --------------------------------------------------------------------- |
| Labirinto | Âmbar | Ligar o círculo ao arco; trechos do grid estão quebrados              |
| Pontos    | Verde | A linha deve passar por **todos** os hexágonos escuros                |
| Quadrados | Azul  | A linha deve separar quadrados pretos e brancos em regiões diferentes |

Todos os puzzles são gerados aleatoriamente **com solução garantida** (testado com 2.700 gerações em `scripts/test-puzzles.ts`).

## Recursos

- Alarmes recorrentes por dia da semana ou de uma vez só
- Dificuldade (fácil/médio/difícil) e tipo de puzzle (ou aleatório) por alarme
- **Soneca também exige puzzle** (um labirinto fácil)
- Botão **Resetar** sempre visível; após **5+ erros e 5 minutos tocando**, uma saída mais fácil aparece no painel (nunca troca o puzzle)
- 4 sons sintetizados via Web Audio (sem arquivos), volume crescente configurável, vibração
- Tutorial interativo das 3 mecânicas + modo de teste de puzzles nas Configurações
- PT-BR / EN
- Tudo salvo no aparelho (Capacitor Preferences)

## Rodar no PC

```bash
npm install
npm run dev
```

Abra a URL exibida (ex.: http://localhost:5173) — de preferência com o modo mobile do DevTools (F12 → ícone de celular).

## Gerar o APK (Android)

Pré-requisito: [Android Studio](https://developer.android.com/studio) instalado.

```bash
npm run sync          # build web + copia para android/
npx cap open android  # abre no Android Studio
```

No Android Studio: **Build → Build APK(s)**, ou conecte o celular com depuração USB e clique em ▶ Run.

> No celular, aceite a permissão de notificações e, nas configurações do Android, permita "Alarmes e lembretes" (alarme exato) para o app — assim a notificação dispara na hora certa mesmo com o app fechado. Tocar na notificação abre a tela do puzzle.

## Estrutura

- `src/puzzle/` — gerador e validador dos 3 tipos de painel
- `src/components/PuzzlePanel.tsx` — painel SVG interativo (desenho por toque)
- `src/audio/alarmSound.ts` — sons sintetizados + rampa de volume
- `src/alarm/scheduler.ts` — próxima ocorrência, notificações nativas, vibração
- `src/screens/` — Home, Editar alarme, Tocando, Configurações, Tutorial, Teste
