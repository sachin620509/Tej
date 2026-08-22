import type { PublicProfile } from '@instaframe/contracts';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { mobileApi } from './api';
import { colors } from './theme';

const reasons = ['spam', 'harassment', 'fake_account', 'impersonation', 'scam', 'other'] as const;
type Reason = (typeof reasons)[number];

export function ProfileSafetyActions({ profile, onBlocked }: { profile: PublicProfile; onBlocked(): void }) {
  const [menu, setMenu] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [reason, setReason] = useState<Reason>('spam');
  const [details, setDetails] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const mute = async () => {
    setBusy(true);
    try {
      await mobileApi(`/api/mutes/${profile.id}`, { method: 'POST' });
      setStatus(`@${profile.username} muted. You can undo this in Safety Center.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not mute this account');
    } finally {
      setBusy(false);
    }
  };

  const block = async () => {
    setBusy(true);
    try {
      await mobileApi(`/api/blocks/${profile.id}`, { method: 'POST' });
      setConfirmBlock(false);
      setMenu(false);
      onBlocked();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not block this account');
      setConfirmBlock(false);
      setMenu(true);
    } finally {
      setBusy(false);
    }
  };

  const report = async () => {
    setBusy(true);
    try {
      await mobileApi('/api/reports', {
        method: 'POST',
        body: JSON.stringify({ targetType: 'profile', targetId: profile.id, reason, details: details.trim() || undefined }),
      });
      setReporting(false);
      setMenu(true);
      setStatus('Report submitted. Our moderation team will review it.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not submit report');
    } finally {
      setBusy(false);
    }
  };

  return <>
    <Pressable accessibilityLabel="Profile safety options" style={s.moreButton} onPress={() => setMenu(true)}>
      <Text style={s.moreText}>More</Text>
    </Pressable>
    <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
      <View style={s.backdrop}><View style={s.sheet}>
        <Text style={s.title}>Account options</Text>
        <Text style={s.subtitle}>@{profile.username}</Text>
        {!!status && <Text style={s.status}>{status}</Text>}
        <Pressable disabled={busy} style={s.option} onPress={() => void mute()}>
          <Text style={s.optionTitle}>Mute account</Text><Text style={s.hint}>Hide their content without notifying them</Text>
        </Pressable>
        <Pressable style={s.option} onPress={() => { setMenu(false); setReporting(true); }}>
          <Text style={s.danger}>Report profile</Text><Text style={s.hint}>Send this profile to the moderation team</Text>
        </Pressable>
        <Pressable style={s.option} onPress={() => { setMenu(false); setConfirmBlock(true); }}>
          <Text style={s.danger}>Block account</Text><Text style={s.hint}>Stops follows, messages, calls and discovery</Text>
        </Pressable>
        <Pressable style={s.cancel} onPress={() => setMenu(false)}><Text>Cancel</Text></Pressable>
      </View></View>
    </Modal>
    <Modal visible={reporting} transparent animationType="slide" onRequestClose={() => setReporting(false)}>
      <View style={s.backdrop}><View style={s.sheet}>
        <Text style={s.title}>Why are you reporting this profile?</Text>
        <View style={s.chips}>{reasons.map(item => <Pressable key={item} style={[s.chip, reason === item && s.chipActive]} onPress={() => setReason(item)}><Text style={reason === item ? s.chipActiveText : s.chipText}>{item.replace('_', ' ')}</Text></Pressable>)}</View>
        <TextInput value={details} onChangeText={setDetails} maxLength={1000} multiline placeholder="Additional details (optional)" style={s.input}/>
        {!!status && <Text style={s.error}>{status}</Text>}
        <Pressable disabled={busy} style={s.submit} onPress={() => void report()}><Text style={s.submitText}>{busy ? 'Submitting...' : 'Submit report'}</Text></Pressable>
        <Pressable style={s.cancel} onPress={() => setReporting(false)}><Text>Cancel</Text></Pressable>
      </View></View>
    </Modal>
    <Modal visible={confirmBlock} transparent animationType="fade" onRequestClose={() => setConfirmBlock(false)}>
      <View style={s.backdrop}><View style={s.confirm}>
        <Text style={s.title}>Block @{profile.username}?</Text>
        <Text style={s.confirmText}>You will unfollow each other. They cannot message, call or find you through discovery. They are not notified.</Text>
        <Pressable disabled={busy} style={s.blockButton} onPress={() => void block()}><Text style={s.submitText}>{busy ? 'Blocking...' : 'Block account'}</Text></Pressable>
        <Pressable style={s.cancel} onPress={() => setConfirmBlock(false)}><Text>Cancel</Text></Pressable>
      </View></View>
    </Modal>
  </>;
}

const s = StyleSheet.create({
  moreButton:{borderWidth:1,borderColor:colors.line,paddingHorizontal:13,borderRadius:9,alignItems:'center',justifyContent:'center'},moreText:{fontWeight:'800',color:colors.ink},backdrop:{flex:1,backgroundColor:'rgba(0,0,0,.55)',justifyContent:'flex-end'},sheet:{backgroundColor:'white',padding:20,borderTopLeftRadius:24,borderTopRightRadius:24},confirm:{backgroundColor:'white',margin:22,padding:20,borderRadius:20},title:{fontSize:19,fontWeight:'900',color:colors.ink},subtitle:{color:colors.muted,marginTop:3,marginBottom:10},status:{backgroundColor:'#e8f3ed',color:colors.green,padding:10,borderRadius:9,marginVertical:8},option:{paddingVertical:14,borderBottomWidth:1,borderColor:colors.line},optionTitle:{fontWeight:'800',color:colors.ink},danger:{fontWeight:'900',color:colors.danger},hint:{fontSize:11,color:colors.muted,marginTop:4},cancel:{alignItems:'center',padding:14},chips:{flexDirection:'row',flexWrap:'wrap',gap:8,marginVertical:16},chip:{borderWidth:1,borderColor:colors.line,borderRadius:18,paddingVertical:8,paddingHorizontal:11},chipActive:{backgroundColor:colors.ink,borderColor:colors.ink},chipText:{color:colors.ink,textTransform:'capitalize'},chipActiveText:{color:'white',textTransform:'capitalize'},input:{minHeight:86,borderWidth:1,borderColor:colors.line,borderRadius:12,padding:12,textAlignVertical:'top'},submit:{backgroundColor:colors.green,padding:13,borderRadius:10,alignItems:'center',marginTop:14},blockButton:{backgroundColor:colors.danger,padding:13,borderRadius:10,alignItems:'center',marginTop:18},submitText:{color:'white',fontWeight:'900'},error:{color:colors.danger,marginTop:10},confirmText:{color:colors.muted,lineHeight:19,marginTop:10},
});
