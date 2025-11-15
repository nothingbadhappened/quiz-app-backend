import { StreakRepository } from './repository'
import { StreakState } from './types'

export class StreakService {
  constructor(private streakRepo: StreakRepository) {}

  async getStreak(userId: string): Promise<StreakState | null> {
    return this.streakRepo.getStreak(userId)
  }

  async updateStreak(userId: string, currentStreak: number, bestStreak: number): Promise<void> {
    await this.streakRepo.updateStreak(userId, currentStreak, bestStreak)
  }

  async initializeStreak(userId: string): Promise<void> {
    await this.streakRepo.initializeStreak(userId)
  }
}
