import React from 'react';
import {ScrollView,Text} from 'react-native';
import Constants from 'expo-constants';
import {useTranslation} from 'react-i18next';
import {colors} from '../theme';
export default function AboutScreen(){
  const {t}=useTranslation();
  return <ScrollView contentContainerStyle={{padding:24,gap:18,flexGrow:1,backgroundColor:colors.background}}>
    <Text style={{fontSize:26,fontWeight:'600',color:colors.ink}}>LocaMap</Text>
    <Text style={{fontSize:16,lineHeight:24,color:colors.ink}}>{t('about.description','Recherchez un logement, échangez avec son propriétaire et suivez vos demandes de location au Rwanda.')}</Text>
    <Text style={{color:colors.inkSubtle}}>{t('about.version','Version')} {Constants.expoConfig?.version ?? '1.0.0'}</Text>
  </ScrollView>;
}
