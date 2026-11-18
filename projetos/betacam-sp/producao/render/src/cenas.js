// As 18 cenas do vídeo. Cada uma: preparar(A,S) uma vez; quadro(lt,S,A) -> { cena, cam, pos, overlay }; sons(S) -> efeitos.
import { s01, s02, s03, s04, s05, s06 } from './cenas1.js';
import { s07, s08, s09, s10, s11, s12 } from './cenas2.js';
import { s13, s14, s15, s16, s17, s18 } from './cenas3.js';

export { criarAtivos, tituloCapitulo } from './base.js';

export const CENAS = {
  s01_introducao: s01,
  s02_origem: s02,
  s03_preco: s03,
  s04_fita_s: s04,
  s05_fita_l: s05,
  s06_videocassete: s06,
  s07_conexoes: s07,
  s08_inserindo: s08,
  s09_duracao: s09,
  s10_gravar: s10,
  s11_frames: s11,
  s12_manutencao: s12,
  s13_mecanismo: s13,
  s14_ejetando: s14,
  s15_emissoras: s15,
  s16_desligar: s16,
  s17_fim: s17,
  s18_encerramento: s18,
};
