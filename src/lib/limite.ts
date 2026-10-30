/**
 * Limite de tentativas em memória, por chave (ex.: "setup", "link-magico"). Basta para um único usuário e um único
 * processo web; reinicia junto com o processo.
 */
export class LimiteTentativas {
  private readonly registros = new Map<string, number[]>();

  constructor(
    private readonly maximo: number,
    private readonly janelaMs: number,
  ) {}

  /** Registra uma tentativa; devolve false se a chave já esgotou o limite na janela. */
  tentar(chave: string, agora: number = Date.now()): boolean {
    const recentes = (this.registros.get(chave) ?? []).filter((t) => agora - t < this.janelaMs);
    if (recentes.length >= this.maximo) {
      this.registros.set(chave, recentes);
      return false;
    }
    recentes.push(agora);
    this.registros.set(chave, recentes);
    return true;
  }
}
