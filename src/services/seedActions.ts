import { collection, addDoc, getDocs, query, limit, where } from 'firebase/firestore';
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

const parseMinutes = (t: string): number => parseInt(t, 10) || 1;

type SeedSenseInput = {
  title: string;
  description: string;
  difficulty: string;
  estimated_time: string;
  place_tag: string;
  share_copy_template: string;
};

const SENSE_ACTIONS: SeedSenseInput[] = [
  { title: "하늘 1분 바라보기", description: "고개를 들어 오늘의 하늘을 눈에 담아보아요", difficulty: "easy", estimated_time: "1분", place_tag: "야외", share_copy_template: "오늘 하늘을 1분 동안 바라봤어요" },
  { title: "구름 모양 찾아보기", description: "오늘 구름 속에 어떤 모양이 숨어있나요?", difficulty: "easy", estimated_time: "1분", place_tag: "야외", share_copy_template: "오늘 구름에서 모양을 찾았어요" },
  { title: "길가의 꽃 향기 맡기", description: "바쁜 하루도 잠깐 멈춰서 자연을 느껴보아요", difficulty: "easy", estimated_time: "1분", place_tag: "야외", share_copy_template: "오늘 잠깐 멈춰서 꽃 향기를 맡았어요" },
  { title: "오늘 마신 음료 사진 찍기", description: "아주 작은 일상도 기록이 되면 추억이 돼요", difficulty: "easy", estimated_time: "1분", place_tag: "어디서나", share_copy_template: "오늘의 작은 일상을 기록했어요" },
  { title: "창밖 풍경 사진 찍기", description: "지금 이 순간의 창밖을 기억해봐요", difficulty: "easy", estimated_time: "1분", place_tag: "실내", share_copy_template: "오늘의 창밖 풍경을 담았어요" },
  { title: "발밑 땅 내려다보기", description: "늘 지나치던 바닥에도 이야기가 있어요", difficulty: "easy", estimated_time: "1분", place_tag: "야외", share_copy_template: "늘 지나치던 바닥을 자세히 봤어요" },
  { title: "오늘 날씨 피부로 느끼기", description: "잠깐 밖에 나가 오늘의 바람을 온몸으로 맞아봐요", difficulty: "easy", estimated_time: "1분", place_tag: "야외", share_copy_template: "오늘의 바람을 온몸으로 느꼈어요" },
  { title: "지금 들리는 소리 3가지 찾기", description: "눈을 감고 주변의 소리에 집중해봐요", difficulty: "easy", estimated_time: "1분", place_tag: "어디서나", share_copy_template: "눈을 감고 주변 소리에 집중했어요" },
  { title: "오늘 먹은 음식 사진 찍기", description: "맛있는 한 끼도 기록하면 더 소중해져요", difficulty: "easy", estimated_time: "1분", place_tag: "어디서나", share_copy_template: "오늘의 한 끼를 기록했어요" },
  { title: "내 손 자세히 들여다보기", description: "매일 쓰는 손인데 자세히 본 적 있나요?", difficulty: "easy", estimated_time: "1분", place_tag: "어디서나", share_copy_template: "매일 쓰는 내 손을 자세히 들여다봤어요" },
  { title: "나무 한 그루 사진 찍기", description: "오늘의 나무는 어떤 모습인가요?", difficulty: "easy", estimated_time: "1분", place_tag: "야외", share_copy_template: "오늘의 나무를 담았어요" },
  { title: "그림자 사진 찍기", description: "빛이 만들어낸 나만의 그림자를 담아봐요", difficulty: "easy", estimated_time: "1분", place_tag: "야외", share_copy_template: "빛이 만들어낸 그림자를 담았어요" },
  { title: "물 한 잔 천천히 마시기", description: "급하게 마시지 말고 물 맛을 천천히 느껴봐요", difficulty: "easy", estimated_time: "1분", place_tag: "어디서나", share_copy_template: "물 한 잔을 천천히 음미했어요" },
  { title: "오늘의 하늘 색깔 기록하기", description: "오늘 하늘은 어떤 색인가요?", difficulty: "easy", estimated_time: "1분", place_tag: "야외", share_copy_template: "오늘 하늘의 색깔을 기록했어요" },
  { title: "신발 사진 찍기", description: "오늘 나를 데리고 다닌 신발에게 고마움을", difficulty: "easy", estimated_time: "1분", place_tag: "어디서나", share_copy_template: "오늘 나를 데리고 다닌 신발을 담았어요" },
  { title: "지금 앉은 자리 둘러보기", description: "익숙한 공간을 처음 온 것처럼 바라봐요", difficulty: "easy", estimated_time: "1분", place_tag: "어디서나", share_copy_template: "익숙한 공간을 새로운 눈으로 봤어요" },
  { title: "햇빛 닿는 곳 사진 찍기", description: "햇살이 가장 예쁘게 떨어지는 곳을 찾아봐요", difficulty: "easy", estimated_time: "1분", place_tag: "어디서나", share_copy_template: "햇살이 가장 예쁜 곳을 찾았어요" },
  { title: "오늘 처음 눈에 띈 색 찍기", description: "유독 눈에 들어오는 색이 있나요?", difficulty: "easy", estimated_time: "1분", place_tag: "어디서나", share_copy_template: "오늘 유독 눈에 띈 색을 담았어요" },
  { title: "빗소리 들으며 창문 찍기", description: "비 오는 날 창문에 맺힌 빗방울을 담아봐요", difficulty: "easy", estimated_time: "1분", place_tag: "실내", share_copy_template: "빗방울이 맺힌 창문을 담았어요" },
  { title: "지금 주변 냄새 맡기", description: "지금 주변에서 나는 냄새는 어떤 건가요?", difficulty: "easy", estimated_time: "1분", place_tag: "어디서나", share_copy_template: "지금 이 순간의 냄새를 기억했어요" },
  { title: "책상 위 물건 하나 자세히 보기", description: "매일 보는 물건인데 제대로 본 적 있나요?", difficulty: "easy", estimated_time: "1분", place_tag: "실내", share_copy_template: "매일 보던 물건을 처음처럼 들여다봤어요" },
  { title: "오늘 걸은 길 사진 찍기", description: "늘 다니는 길도 사진으로 남기면 달라보여요", difficulty: "easy", estimated_time: "1분", place_tag: "야외", share_copy_template: "늘 다니던 길을 새롭게 담았어요" },
  { title: "하늘과 건물 경계선 찍기", description: "도시와 하늘이 만나는 선을 담아봐요", difficulty: "easy", estimated_time: "1분", place_tag: "야외", share_copy_template: "도시와 하늘이 만나는 선을 담았어요" },
  { title: "내 몸에서 가장 따뜻한 곳 찾기", description: "손을 얹어서 가장 따뜻한 곳을 찾아봐요", difficulty: "easy", estimated_time: "1분", place_tag: "어디서나", share_copy_template: "내 몸에서 가장 따뜻한 곳을 찾았어요" },
  { title: "오늘 본 가장 작은 것 찍기", description: "작고 사소한 것에 집중해봐요", difficulty: "easy", estimated_time: "1분", place_tag: "어디서나", share_copy_template: "오늘 가장 작은 것에 집중했어요" },
  { title: "커피/차 한 모금 음미하기", description: "급하게 넘기지 말고 한 모금을 천천히 느껴봐요", difficulty: "easy", estimated_time: "1분", place_tag: "어디서나", share_copy_template: "한 모금을 천천히 음미했어요" },
  { title: "지금 주변 가장 오래된 것 찾기", description: "내 주변에서 가장 오래된 것은 무엇인가요?", difficulty: "easy", estimated_time: "1분", place_tag: "어디서나", share_copy_template: "가장 오래된 것에서 세월을 느꼈어요" },
  { title: "맨발로 바닥 느끼기", description: "신발을 잠깐 벗고 바닥의 감촉을 느껴봐요", difficulty: "easy", estimated_time: "1분", place_tag: "실내", share_copy_template: "맨발로 바닥의 감촉을 느꼈어요" },
  { title: "지금 내 호흡 10번 세기", description: "숨을 쉬고 있다는 것만으로도 충분해요", difficulty: "easy", estimated_time: "1분", place_tag: "어디서나", share_copy_template: "잠깐 멈추고 내 호흡에 집중했어요" },
  { title: "밤하늘에서 별 찾기", description: "밤하늘에 별이 몇 개나 보이나요?", difficulty: "easy", estimated_time: "1분", place_tag: "야외", share_copy_template: "오늘 밤하늘에서 별을 찾았어요" },
  { title: "주변 색깔 5가지 찾기", description: "주변을 둘러보며 색깔 이름을 붙여봐요", difficulty: "easy", estimated_time: "1분", place_tag: "어디서나", share_copy_template: "주변에서 5가지 색깔을 찾았어요" },
  { title: "오늘 걸은 계단 사진 찍기", description: "오늘 오른 계단을 사진으로 남겨봐요", difficulty: "easy", estimated_time: "1분", place_tag: "어디서나", share_copy_template: "오늘 내가 오른 계단을 담았어요" },
  { title: "풀잎 하나 자세히 들여다보기", description: "작은 풀잎에도 섬세한 결이 있어요", difficulty: "easy", estimated_time: "1분", place_tag: "야외", share_copy_template: "작은 풀잎의 섬세한 결을 봤어요" },
  { title: "오늘 일몰/일출 사진 찍기", description: "하루의 시작과 끝을 사진으로 기억해봐요", difficulty: "easy", estimated_time: "1분", place_tag: "야외", share_copy_template: "하루의 빛을 사진으로 기억했어요" },
  { title: "물 흐르는 소리 듣기", description: "분수, 개울, 수도꼭지 물소리에 집중해봐요", difficulty: "easy", estimated_time: "1분", place_tag: "어디서나", share_copy_template: "물 흐르는 소리에 잠시 집중했어요" },
  { title: "눈 감고 주변 소리 집중하기", description: "소리만으로 주변 공간을 상상해봐요", difficulty: "medium", estimated_time: "2분", place_tag: "어디서나", share_copy_template: "눈을 감고 소리로 세상을 느꼈어요" },
  { title: "오늘 가장 마음에 드는 풍경 찍기", description: "오늘 하루 중 가장 예뻤던 순간을 담아봐요", difficulty: "medium", estimated_time: "2분", place_tag: "어디서나", share_copy_template: "오늘 가장 예뻤던 순간을 담았어요" },
  { title: "빛과 그림자 패턴 찾아 찍기", description: "빛이 만들어낸 패턴을 예술 작품처럼 담아봐요", difficulty: "medium", estimated_time: "2분", place_tag: "어디서나", share_copy_template: "빛과 그림자가 만든 패턴을 담았어요" },
  { title: "오늘 날씨를 한 단어로 표현하기", description: "오늘 날씨의 느낌을 딱 한 단어로 표현해봐요", difficulty: "medium", estimated_time: "2분", place_tag: "야외", share_copy_template: "오늘 날씨를 한 단어로 표현했어요" },
  { title: "새소리 듣고 새 찾아 찍기", description: "소리는 들리는데 새는 어디 있을까요?", difficulty: "medium", estimated_time: "2분", place_tag: "야외", share_copy_template: "새소리를 따라 새를 찾았어요" },
  { title: "오늘 가장 좋아하는 질감 찾기", description: "손으로 만졌을 때 가장 좋은 느낌의 것을 찾아봐요", difficulty: "medium", estimated_time: "2분", place_tag: "어디서나", share_copy_template: "가장 좋아하는 질감을 찾았어요" },
  { title: "반사된 세상 사진 찍기", description: "유리, 물웅덩이에 비친 세상을 담아봐요", difficulty: "medium", estimated_time: "2분", place_tag: "야외", share_copy_template: "반사된 또 다른 세상을 담았어요" },
  { title: "구름 변화 2분 관찰하기", description: "2분 동안 구름이 얼마나 움직이는지 봐요", difficulty: "medium", estimated_time: "2분", place_tag: "야외", share_copy_template: "2분 동안 구름의 변화를 관찰했어요" },
  { title: "오늘 가장 맛있었던 것 기억하기", description: "오늘 먹은 것 중 가장 맛있었던 걸 사진으로", difficulty: "medium", estimated_time: "2분", place_tag: "어디서나", share_copy_template: "오늘 가장 맛있었던 순간을 담았어요" },
  { title: "내 발자국 사진 찍기", description: "모래, 눈, 흙 위에 남긴 내 발자국을 담아봐요", difficulty: "medium", estimated_time: "2분", place_tag: "야외", share_copy_template: "내가 지나간 흔적을 담았어요" },
  { title: "지금 이 순간 5가지 감각 기록", description: "보이는 것, 들리는 것, 냄새, 맛, 촉감을 기록해봐요", difficulty: "medium", estimated_time: "3분", place_tag: "어디서나", share_copy_template: "5가지 감각으로 지금 이 순간을 기록했어요" },
  { title: "오래된 건물 디테일 찍기", description: "오래된 건물의 낡고 아름다운 부분을 찾아봐요", difficulty: "medium", estimated_time: "2분", place_tag: "야외", share_copy_template: "세월이 담긴 건물의 디테일을 찾았어요" },
  { title: "식물 잎 뒷면 사진 찍기", description: "앞면만 봤다면 뒷면도 한번 들여다봐요", difficulty: "medium", estimated_time: "2분", place_tag: "어디서나", share_copy_template: "늘 보던 식물의 다른 면을 발견했어요" },
  { title: "오늘 하늘 파란 정도 측정하기", description: "0~10점으로 오늘 하늘의 파란 정도를 매겨봐요", difficulty: "medium", estimated_time: "2분", place_tag: "야외", share_copy_template: "오늘 하늘의 파란 정도를 측정했어요" },
  { title: "지금 앉은 의자 질감 느끼기", description: "내가 앉은 의자의 느낌을 손으로 느껴봐요", difficulty: "medium", estimated_time: "1분", place_tag: "어디서나", share_copy_template: "늘 앉던 의자를 새롭게 느꼈어요" },
  { title: "오늘 하늘에서 비행기 찾기", description: "하늘을 가로지르는 비행기를 찾아 담아봐요", difficulty: "easy", estimated_time: "1분", place_tag: "야외", share_copy_template: "하늘을 가로지르는 비행기를 찾았어요" },
  { title: "지금 내 주변 가장 부드러운 것 찾기", description: "손으로 만졌을 때 가장 부드러운 것은 무엇인가요?", difficulty: "easy", estimated_time: "1분", place_tag: "어디서나", share_copy_template: "가장 부드러운 것을 찾아 느껴봤어요" },
  { title: "오늘 가장 마음에 드는 냄새 맡기", description: "좋아하는 냄새를 의도적으로 찾아봐요", difficulty: "easy", estimated_time: "1분", place_tag: "어디서나", share_copy_template: "오늘 가장 좋아하는 냄새를 찾았어요" },
  { title: "지금 창문 너머 세상 찍기", description: "유리 너머의 세상은 어떤 모습인가요?", difficulty: "easy", estimated_time: "1분", place_tag: "실내", share_copy_template: "창문 너머의 세상을 담았어요" },
  { title: "오늘 마주친 고양이/강아지 찍기", description: "길에서 마주친 동물 친구를 담아봐요", difficulty: "easy", estimated_time: "1분", place_tag: "야외", share_copy_template: "오늘 마주친 동물 친구를 담았어요" },
  { title: "지금 내 손등에 햇빛 올리기", description: "손등에 햇빛을 올리고 따뜻함을 느껴봐요", difficulty: "easy", estimated_time: "1분", place_tag: "야외", share_copy_template: "손등에 햇빛을 올려 따뜻함을 느꼈어요" },
  { title: "오늘 걸으며 밟은 낙엽 찍기", description: "바스락거리는 낙엽의 느낌을 기억해봐요", difficulty: "easy", estimated_time: "1분", place_tag: "야외", share_copy_template: "낙엽을 밟으며 계절을 느꼈어요" },
  { title: "지금 주변에서 가장 조용한 곳 찾기", description: "가장 고요한 곳에서 잠시 멈춰봐요", difficulty: "easy", estimated_time: "1분", place_tag: "어디서나", share_copy_template: "가장 조용한 곳에서 잠시 멈췄어요" },
  { title: "오늘 가장 예쁜 간판 찍기", description: "길을 걸으며 눈에 띄는 간판을 담아봐요", difficulty: "easy", estimated_time: "1분", place_tag: "야외", share_copy_template: "오늘 가장 예쁜 간판을 발견했어요" },
  { title: "지금 내 심장 박동 느끼기", description: "가슴에 손을 얹고 심장 박동을 느껴봐요", difficulty: "easy", estimated_time: "1분", place_tag: "어디서나", share_copy_template: "내 심장 박동을 느끼며 살아있음을 확인했어요" },
  { title: "오늘 마주친 꽃 사진 찍기", description: "길에서 만난 꽃을 자세히 들여다봐요", difficulty: "easy", estimated_time: "1분", place_tag: "야외", share_copy_template: "오늘 마주친 꽃을 자세히 담았어요" },
  { title: "지금 내 주변 가장 무거운 것 찾기", description: "들어봤을 때 가장 무거운 것은 무엇인가요?", difficulty: "easy", estimated_time: "1분", place_tag: "어디서나", share_copy_template: "가장 무거운 것을 찾아봤어요" },
  { title: "오늘 하늘에서 달 찾기", description: "낮에도 달이 보일 때가 있어요, 찾아봐요", difficulty: "easy", estimated_time: "1분", place_tag: "야외", share_copy_template: "오늘 하늘에서 달을 찾았어요" },
  { title: "지금 발바닥 느끼기", description: "바닥에 닿은 발바닥의 감촉을 느껴봐요", difficulty: "easy", estimated_time: "1분", place_tag: "어디서나", share_copy_template: "발바닥으로 바닥의 감촉을 느꼈어요" },
  { title: "오늘 가장 높은 곳에서 내려다보기", description: "높은 곳에서 내려다본 세상을 담아봐요", difficulty: "easy", estimated_time: "1분", place_tag: "어디서나", share_copy_template: "높은 곳에서 세상을 내려다봤어요" },
  { title: "지금 주변 가장 반짝이는 것 찍기", description: "빛을 받아 반짝이는 것을 찾아봐요", difficulty: "easy", estimated_time: "1분", place_tag: "어디서나", share_copy_template: "빛을 받아 반짝이는 것을 찾았어요" },
  { title: "오늘 비 온 뒤 냄새 맡기", description: "비 온 후 흙냄새를 맡아본 적 있나요?", difficulty: "easy", estimated_time: "1분", place_tag: "야외", share_copy_template: "비 온 뒤 흙냄새를 맡았어요" },
  { title: "지금 내 눈썹 만져보기", description: "평소에 신경 쓰지 않던 신체 부위를 느껴봐요", difficulty: "easy", estimated_time: "1분", place_tag: "어디서나", share_copy_template: "평소에 신경 쓰지 않던 곳을 느껴봤어요" },
  { title: "오늘 가장 오래 바라본 것 찍기", description: "오늘 유독 시선이 머문 것을 담아봐요", difficulty: "easy", estimated_time: "1분", place_tag: "어디서나", share_copy_template: "오늘 시선이 가장 오래 머문 것을 담았어요" },
  { title: "지금 주변 가장 동그란 것 찾기", description: "완벽한 원형에 가까운 것을 찾아봐요", difficulty: "easy", estimated_time: "1분", place_tag: "어디서나", share_copy_template: "가장 동그란 것을 찾았어요" },
  { title: "오늘 걸으며 바람 방향 느끼기", description: "바람이 어디서 불어오는지 느껴봐요", difficulty: "easy", estimated_time: "1분", place_tag: "야외", share_copy_template: "바람의 방향을 느끼며 걸었어요" },
  { title: "지금 내 주변 가장 차가운 것 찾기", description: "손으로 만졌을 때 가장 차가운 것은 무엇인가요?", difficulty: "easy", estimated_time: "1분", place_tag: "어디서나", share_copy_template: "가장 차가운 것을 찾아봤어요" },
  { title: "오늘 하늘에서 새 찾아 찍기", description: "하늘을 나는 새를 찾아 담아봐요", difficulty: "easy", estimated_time: "1분", place_tag: "야외", share_copy_template: "하늘을 나는 새를 찾아 담았어요" },
  { title: "지금 내 주변 가장 낡은 것 찍기", description: "세월의 흔적이 담긴 것을 찾아봐요", difficulty: "easy", estimated_time: "1분", place_tag: "어디서나", share_copy_template: "세월의 흔적이 담긴 것을 발견했어요" },
  { title: "오늘 가장 맑은 소리 찾기", description: "청아하게 들리는 소리를 찾아봐요", difficulty: "easy", estimated_time: "1분", place_tag: "어디서나", share_copy_template: "오늘 가장 맑은 소리를 찾았어요" },
  { title: "빗방울 맞으며 서있기", description: "우산 없이 빗방울을 잠깐 느껴봐요", difficulty: "medium", estimated_time: "2분", place_tag: "야외", share_copy_template: "빗방울을 맞으며 비를 온몸으로 느꼈어요" },
  { title: "오늘 맨발로 풀밭 걷기", description: "신발을 벗고 풀밭을 걸어봐요", difficulty: "medium", estimated_time: "2분", place_tag: "야외", share_copy_template: "맨발로 풀밭을 걸으며 자연을 느꼈어요" },
  { title: "지금 이 순간 색깔로 표현하기", description: "지금 내 감정을 색깔로 표현한다면 무슨 색인가요?", difficulty: "medium", estimated_time: "2분", place_tag: "어디서나", share_copy_template: "지금 내 감정을 색깔로 표현했어요" },
  { title: "오늘 가장 긴 그림자 찾기", description: "해가 낮을 때 가장 긴 그림자를 찾아봐요", difficulty: "medium", estimated_time: "2분", place_tag: "야외", share_copy_template: "오늘 가장 긴 그림자를 찾았어요" },
  { title: "지금 주변 소리로 음악 만들기", description: "주변 소리를 조합해 리듬을 느껴봐요", difficulty: "medium", estimated_time: "2분", place_tag: "어디서나", share_copy_template: "주변 소리로 나만의 음악을 만들었어요" },
  { title: "오늘 걸으며 발소리 듣기", description: "내 발소리에 집중하며 걸어봐요", difficulty: "medium", estimated_time: "2분", place_tag: "어디서나", share_copy_template: "내 발소리에 집중하며 걸었어요" },
  { title: "지금 숨 참고 10초 버티기", description: "숨을 참았다가 내쉬며 공기를 느껴봐요", difficulty: "medium", estimated_time: "2분", place_tag: "어디서나", share_copy_template: "숨을 참았다 내쉬며 공기의 소중함을 느꼈어요" },
  { title: "오늘 가장 복잡한 패턴 찾기", description: "타일, 벽지, 자연에서 복잡한 패턴을 찾아봐요", difficulty: "medium", estimated_time: "2분", place_tag: "어디서나", share_copy_template: "숨어있던 복잡한 패턴을 발견했어요" },
  { title: "지금 내 피부로 온도 차이 느끼기", description: "햇빛과 그늘의 온도 차이를 느껴봐요", difficulty: "medium", estimated_time: "2분", place_tag: "야외", share_copy_template: "햇빛과 그늘의 온도 차이를 피부로 느꼈어요" },
  { title: "오늘 가장 좁은 길 걸어보기", description: "평소에 지나치던 좁은 골목을 걸어봐요", difficulty: "medium", estimated_time: "2분", place_tag: "야외", share_copy_template: "평소에 지나치던 좁은 골목을 걸었어요" },
  { title: "지금 주변에서 하트 모양 찾기", description: "자연이나 사물에서 하트 모양을 찾아봐요", difficulty: "medium", estimated_time: "2분", place_tag: "어디서나", share_copy_template: "주변에서 하트 모양을 발견했어요" },
  { title: "오늘 먹은 음식 향 음미하기", description: "먹기 전에 음식 향을 먼저 천천히 맡아봐요", difficulty: "medium", estimated_time: "2분", place_tag: "어디서나", share_copy_template: "음식 향을 먼저 천천히 음미했어요" },
  { title: "지금 주변 가장 직선에 가까운 것 찾기", description: "완벽한 직선을 가진 것을 찾아봐요", difficulty: "medium", estimated_time: "2분", place_tag: "어디서나", share_copy_template: "완벽한 직선을 가진 것을 찾았어요" },
  { title: "오늘 하늘 구름 이름 붙여주기", description: "구름에 나만의 이름을 붙여봐요", difficulty: "medium", estimated_time: "2분", place_tag: "야외", share_copy_template: "구름에 나만의 이름을 붙여줬어요" },
  { title: "지금 내 손으로 악기 소리 내기", description: "손뼉, 손가락 튕기기로 리듬을 만들어봐요", difficulty: "medium", estimated_time: "2분", place_tag: "어디서나", share_copy_template: "내 손으로 리듬을 만들었어요" },
  { title: "오늘 가장 편안한 자세 찾기", description: "내 몸이 가장 편안한 자세를 찾아 사진 찍기", difficulty: "medium", estimated_time: "3분", place_tag: "어디서나", share_copy_template: "내 몸이 가장 편안한 자세를 찾았어요" },
  { title: "지금 주변에서 글자 찾아 모으기", description: "간판, 포장지 등에서 글자를 모아 단어 만들기", difficulty: "medium", estimated_time: "3분", place_tag: "어디서나", share_copy_template: "주변 글자를 모아 단어를 만들었어요" },
  { title: "오늘 해질녘 하늘 변화 관찰하기", description: "3분 동안 하늘색이 어떻게 변하는지 봐요", difficulty: "medium", estimated_time: "3분", place_tag: "야외", share_copy_template: "해질녘 하늘이 변하는 걸 지켜봤어요" },
  { title: "지금 내 주변 자연물로 모양 만들기", description: "나뭇잎, 돌, 꽃잎으로 작은 모양을 만들어봐요", difficulty: "medium", estimated_time: "3분", place_tag: "야외", share_copy_template: "자연물로 작은 모양을 만들었어요" },
  { title: "오늘 가장 오래된 나무 찾기", description: "가장 굵고 오래된 나무를 찾아 담아봐요", difficulty: "medium", estimated_time: "3분", place_tag: "야외", share_copy_template: "가장 오래된 나무를 찾아 담았어요" },
  { title: "지금 주변 소리 3가지 악보로 그리기", description: "소리를 선이나 점으로 표현해봐요", difficulty: "medium", estimated_time: "3분", place_tag: "어디서나", share_copy_template: "소리를 그림으로 표현해봤어요" },
  { title: "오늘 가장 투명한 것 찍기", description: "빛이 통과하는 투명한 것을 찾아봐요", difficulty: "medium", estimated_time: "2분", place_tag: "어디서나", share_copy_template: "빛이 통과하는 투명한 것을 찾았어요" },
  { title: "지금 내 발 모양 사진 찍기", description: "오늘의 내 발을 기억으로 남겨봐요", difficulty: "medium", estimated_time: "1분", place_tag: "어디서나", share_copy_template: "오늘의 내 발을 기억으로 남겼어요" },
  { title: "오늘 가장 멀리 보이는 것 찾기", description: "지금 이 자리에서 가장 멀리 보이는 것은?", difficulty: "medium", estimated_time: "2분", place_tag: "야외", share_copy_template: "가장 멀리 보이는 것을 찾아봤어요" },
  { title: "지금 이 순간을 한 컷에 담기", description: "지금 이 순간을 가장 잘 표현하는 사진 한 장", difficulty: "medium", estimated_time: "3분", place_tag: "어디서나", share_copy_template: "지금 이 순간을 한 컷에 담았어요" },
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

/**
 * category가 'sense'인 액션이 없을 때만 100개를 업로드한다.
 * 이미 sense 데이터가 있으면 아무것도 하지 않는다.
 */
export async function runSeedSense(): Promise<void> {
  try {
    const snapshot = await getDocs(
      query(collection(db, 'actions'), where('category', '==', 'sense'), limit(50)),
    );
    if (snapshot.size >= 50) {
      console.log('[seed] sense 액션이 이미 충분히 존재합니다. 시딩을 건너뜁니다.');
      return;
    }

    console.log('[seed] sense 액션을 시딩합니다...');
    const docs: SeedAction[] = SENSE_ACTIONS.map((a) => ({
      title: a.title,
      description: a.description,
      category: 'sense',
      difficulty: a.difficulty as Action['difficulty'],
      estimated_time: parseMinutes(a.estimated_time),
      place_tag: a.place_tag,
      is_photo_required: true,
      is_active: true,
      share_copy_template: a.share_copy_template,
      safety_note: '',
      media_type: 'photo' as const,
    }));
    await Promise.all(docs.map((d) => addDoc(collection(db, 'actions'), d)));
    console.log(`[seed] ${docs.length}개 sense 액션 시딩 완료`);
  } catch (e) {
    console.error('[seed] runSeedSense error:', e);
  }
}
