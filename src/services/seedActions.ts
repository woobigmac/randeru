import { collection, addDoc, getDocs, query, limit } from 'firebase/firestore';
import { db } from './firebase';
import { Action } from '../types';

type SeedAction = Omit<Action, 'action_id'>;

const SEED_ACTIONS: SeedAction[] = [
  {
    title: '길가의 쓰레기 하나 줍기',
    description: '세상을 아주 조금 덜 거칠게 만드는 행동',
    category: 'environment',
    difficulty: 'easy',
    estimated_time: 1,
    place_tag: '길거리',
    is_photo_required: true,
    is_active: true,
    share_copy_template: '오늘 길을 조금 더 깨끗하게 만들었어요',
  },
  {
    title: '길가의 꽃 향기 맡아보기',
    description: '바쁜 하루도 잠깐 멈춰서 자연을 느껴보아요',
    category: 'sense',
    difficulty: 'easy',
    estimated_time: 1,
    place_tag: '야외',
    is_photo_required: true,
    is_active: true,
    share_copy_template: '오늘 잠깐 멈춰서 자연을 느꼈어요',
  },
  {
    title: '하늘 1분 바라보기',
    description: '고개를 들어 오늘의 하늘을 눈에 담아보아요',
    category: 'sense',
    difficulty: 'easy',
    estimated_time: 1,
    place_tag: '야외',
    is_photo_required: true,
    is_active: true,
    share_copy_template: '오늘의 하늘을 눈에 담았어요',
  },
  {
    title: '오늘 마신 음료 사진 찍기',
    description: '아주 작은 일상도 기록이 되면 추억이 돼요',
    category: 'sense',
    difficulty: 'easy',
    estimated_time: 1,
    place_tag: '어디서나',
    is_photo_required: true,
    is_active: true,
    share_copy_template: '오늘의 작은 일상을 기록했어요',
  },
  {
    title: '창밖 풍경 사진 찍기',
    description: '지금 이 순간의 창밖을 기억해봐요',
    category: 'sense',
    difficulty: 'easy',
    estimated_time: 1,
    place_tag: '실내',
    is_photo_required: true,
    is_active: true,
    share_copy_template: '오늘의 창밖 풍경을 담았어요',
  },
];

/**
 * Firestore 'actions' 컬렉션이 비어 있을 때만 샘플 액션 5개를 업로드한다.
 * 이미 데이터가 있으면 아무것도 하지 않는다.
 */
export async function runSeedActions(): Promise<void> {
  try {
    const snapshot = await getDocs(query(collection(db, 'actions'), limit(1)));
    if (!snapshot.empty) {
      console.log('[seed] actions 컬렉션에 이미 데이터가 있습니다. 시딩을 건너뜁니다.');
      return;
    }

    console.log('[seed] actions 컬렉션이 비어 있습니다. 샘플 데이터를 추가합니다...');
    await Promise.all(
      SEED_ACTIONS.map((action) => addDoc(collection(db, 'actions'), action)),
    );
    console.log(`[seed] ${SEED_ACTIONS.length}개 액션 시딩 완료`);
  } catch (e) {
    console.error('[seed] runSeedActions error:', e);
  }
}
