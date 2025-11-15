import { SkillLevel, TopicPreference } from './types'
import { DatabaseClient } from '../../shared/database/client'

export class SkillRepository {
  constructor(private db: DatabaseClient) {}

  async getSkill(userId: string): Promise<SkillLevel | null> {
    return await this.db
      .prepare('SELECT mu, updated_at FROM user_skill WHERE user_id = ?')
      .bind(userId)
      .first<SkillLevel>()
  }

  async updateSkill(userId: string, newMu: number): Promise<void> {
    await this.db
      .prepare(
        'INSERT OR REPLACE INTO user_skill (user_id, mu, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)'
      )
      .bind(userId, newMu)
      .run()
  }

  async initializeSkill(userId: string, initialMu: number = 3.0): Promise<void> {
    await this.db
      .prepare('INSERT OR IGNORE INTO user_skill (user_id, mu) VALUES (?, ?)')
      .bind(userId, initialMu)
      .run()
  }

  async getTopicPreferences(userId: string, topics: string[]): Promise<Map<string, number>> {
    if (topics.length === 0) return new Map()

    const placeholders = topics.map(() => '?').join(',')
    const results = await this.db
      .prepare(
        `SELECT topic, weight FROM topic_pref WHERE user_id = ? AND topic IN (${placeholders})`
      )
      .bind(userId, ...topics)
      .all<TopicPreference>()

    const map = new Map<string, number>()
    for (const row of results.results || []) {
      map.set(row.topic, row.weight)
    }
    return map
  }

  async updateTopicPreference(userId: string, topic: string, weight: number): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO topic_pref(user_id, topic, weight)
         VALUES (?, ?, ?)
         ON CONFLICT(user_id, topic) DO UPDATE SET weight = ?`
      )
      .bind(userId, topic, weight, weight)
      .run()
  }
}
