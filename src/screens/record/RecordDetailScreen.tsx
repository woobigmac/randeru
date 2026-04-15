import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RecordsStackParamList } from '../../navigation/RecordsStackNavigator';

type Props = {
  navigation: StackNavigationProp<RecordsStackParamList, 'RecordDetail'>;
  route: RouteProp<RecordsStackParamList, 'RecordDetail'>;
};

const formatDate = (dateStr: string) => dateStr.replace(/-/g, '.');

export default function RecordDetailScreen({ navigation, route }: Props) {
  const { record, action } = route.params;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 48 }}>
      {/* 뒤로가기 */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ padding: 16, paddingTop: 24 }}
      >
        <Text style={{ fontSize: 14, color: '#888' }}>← 뒤로</Text>
      </TouchableOpacity>

      {/* 사진 */}
      {record.photo_uploaded && record.photo_url ? (
        <Image
          source={{ uri: record.photo_url }}
          style={{ width: '100%', height: 260 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: '100%',
            height: 160,
            backgroundColor: '#f5f5f5',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 13, color: '#bbb' }}>사진 없음</Text>
        </View>
      )}

      <View style={{ padding: 20 }}>
        {/* 액션 제목 */}
        <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 8 }}>
          {action.title}
        </Text>

        {/* 날짜 */}
        <Text style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
          {formatDate(record.action_date)}
        </Text>

        {/* 메모 */}
        {record.memo ? (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, color: '#555', fontStyle: 'italic' }}>
              {record.memo}
            </Text>
          </View>
        ) : null}

        {/* 공유 문구 */}
        <View
          style={{
            padding: 16,
            backgroundColor: '#f8f8f8',
            borderRadius: 10,
            marginBottom: 32,
          }}
        >
          <Text style={{ fontSize: 14, color: '#444', lineHeight: 22 }}>
            {action.share_copy_template}
          </Text>
        </View>

        {/* 다시 공유하기 */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Share', { record, action })}
          style={{
            paddingVertical: 14,
            alignItems: 'center',
            backgroundColor: '#000',
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>
            다시 공유하기
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
