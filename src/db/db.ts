import Dexie, { Table } from 'dexie';
import { 
  Mission, 
  UserProfile, 
  Adversary, 
  NutritionLog, 
  BodyJournalEntry, 
  TrainingLogEntry 
} from '../core/types';

export class MakingLegendsDatabase extends Dexie {
  missions!: Table<Mission, string>;
  userProfile!: Table<UserProfile, string>;
  adversaries!: Table<Adversary, string>;
  nutritionLogs!: Table<NutritionLog, string>;
  bodyJournal!: Table<BodyJournalEntry, string>;
  trainingLogs!: Table<TrainingLogEntry, string>;

  constructor() {
    super('MakingLegendsDB');
    this.version(1).stores({
      missions: 'id, pillarId, rank, timeOfDay, isCompletedToday, order',
      userProfile: 'id, currentRankId, level, currentProtocolDay',
      adversaries: 'id, number, isDefeated',
      nutritionLogs: 'id, date',
      bodyJournal: 'date',
      trainingLogs: 'id, date, category'
    });
  }
}

export const db = new MakingLegendsDatabase();
