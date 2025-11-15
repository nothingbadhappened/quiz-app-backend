import { SkillRepository } from './repository'
import { TopicUpdate } from './types'
import { APP_CONFIG } from '../../config/constants'
import { clamp } from '../../shared/utils/math'

export class SkillService {
  constructor(private skillRepo: SkillRepository) {}

  async getUserSkill(userId: string): Promise<number> {
    const skill = await this.skillRepo.getSkill(userId)
    return skill?.mu ?? APP_CONFIG.INITIAL_SKILL_MU
  }

  async updateSkill(userId: string, newMu: number): Promise<void> {
    await this.skillRepo.updateSkill(userId, newMu)
  }

  async initializeSkill(userId: string): Promise<void> {
    await this.skillRepo.initializeSkill(userId, APP_CONFIG.INITIAL_SKILL_MU)
  }

  async getTopicPreferences(userId: string, topics: string[]): Promise<Map<string, number>> {
    return this.skillRepo.getTopicPreferences(userId, topics)
  }

  async updateTopicPreferences(userId: string, updates: TopicUpdate[]): Promise<void> {
    const categories = updates.map((u) => u.category)
    const currentWeights = await this.skillRepo.getTopicPreferences(userId, categories)

    for (const update of updates) {
      const accuracy = update.accuracy
      const delta =
        accuracy > APP_CONFIG.TOPIC_ACCURACY_THRESHOLD_HIGH
          ? APP_CONFIG.TOPIC_WEIGHT_DELTA_HIGH
          : accuracy < APP_CONFIG.TOPIC_ACCURACY_THRESHOLD_LOW
            ? APP_CONFIG.TOPIC_WEIGHT_DELTA_LOW
            : 0

      const currentWeight = currentWeights.get(update.category) ?? 0
      const newWeight = clamp(
        currentWeight + delta,
        APP_CONFIG.MIN_TOPIC_WEIGHT,
        APP_CONFIG.MAX_TOPIC_WEIGHT
      )

      await this.skillRepo.updateTopicPreference(userId, update.category, newWeight)
    }
  }
}
