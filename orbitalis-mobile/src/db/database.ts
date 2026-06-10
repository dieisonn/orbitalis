import * as SQLite from 'expo-sqlite'

// Banco SQLite local — implementa offline-first (§6.3)
// Tabelas espelham o subconjunto necessário para execução em campo

export const db = SQLite.openDatabaseSync('orbitalis.db')

export function initDatabase() {
  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS ordens_servico (
      id                TEXT PRIMARY KEY,
      ambiente_nome     TEXT NOT NULL,
      status            TEXT NOT NULL,
      origem            TEXT NOT NULL,
      data_agendamento  TEXT NOT NULL,
      data_inicio       TEXT,
      data_conclusao    TEXT,
      observacoes_gerais TEXT,
      assinatura_url    TEXT,
      sincronizado      INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS os_itens (
      id                   TEXT PRIMARY KEY,
      ordem_servico_id     TEXT NOT NULL,
      equipamento_id       TEXT NOT NULL,
      equipamento_nome     TEXT NOT NULL,
      equipamento_qr       TEXT NOT NULL,
      status_item          TEXT NOT NULL DEFAULT 'pendente',
      checklist_snapshot   TEXT NOT NULL,
      observacoes_tecnicas TEXT,
      sincronizado         INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (ordem_servico_id) REFERENCES ordens_servico(id)
    );

    CREATE TABLE IF NOT EXISTS fila_sync (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      os_id       TEXT NOT NULL,
      payload     TEXT NOT NULL,
      tentativas  INTEGER NOT NULL DEFAULT 0,
      criado_em   TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
}
