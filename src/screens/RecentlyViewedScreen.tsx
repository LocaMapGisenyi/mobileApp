import React, {useEffect, useState} from 'react';
import {ScrollView, Text, ActivityIndicator} from 'react-native';
import {Button} from 'react-native-paper';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {useUserStore} from '../store/user';
import {clearViewedProperties, getViewedProperties} from '../services/history.service';
import {propertyService} from '../services/api/property.service';
import type {Property, RootStackParamList} from '../types';
import {colors} from '../theme';

export default function RecentlyViewedScreen({navigation}: NativeStackScreenProps<RootStackParamList,'RecentlyViewed'>) {
  const {t}=useTranslation();
  const uid=useUserStore(s=>s.authUser?.id);
  const [items,setItems]=useState<Property[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  useEffect(()=>{
    let active=true;
    setItems([]);setLoading(true);setError('');
    if(!uid){setLoading(false);return;}
    void getViewedProperties(uid).then(async ids=>{
      const results=await Promise.allSettled(ids.map(id=>propertyService.getById(id)));
      if(active){setItems(results.flatMap(r=>r.status==='fulfilled'?[r.value]:[]));if(results.some(r=>r.status==='rejected'))setError(t('recent.partial','Certains logements ne sont plus accessibles.'));}
    }).catch(()=>{if(active)setError(t('recent.error','Impossible de charger l’historique.'));}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[uid,t]);
  const clear=async()=>{if(!uid)return;try{await clearViewedProperties(uid);setItems([]);}catch{setError(t('recent.error','Impossible de charger l’historique.'));}};
  return <ScrollView contentContainerStyle={{padding:24,gap:16,backgroundColor:colors.background,flexGrow:1}}>
    <Text style={{color:colors.inkSubtle}}>{t('recent.local','Les 30 derniers logements consultés sur cet appareil.')}</Text>
    {loading&&<ActivityIndicator color={colors.primary}/>}
    {!!error&&<Text accessibilityRole="alert" style={{color:colors.error}}>{error}</Text>}
    {!loading&&!items.length&&<Text>{t('recent.empty','Aucun logement consulté.')}</Text>}
    {items.map(item=><Button key={item.id} mode="outlined" onPress={()=>navigation.navigate('PropertyDetails',{propertyId:item.id})}>{item.title}</Button>)}
    {!!items.length&&<Button onPress={clear}>{t('recent.clear','Effacer l’historique')}</Button>}
  </ScrollView>;
}
