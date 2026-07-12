import React, { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Flame, Sparkles } from 'lucide-react-native';
import { useApp, type RestTask } from '../context/AppContext';
import { FONTS } from '../theme/tokens';
import { SectionLabel, Sheet, cardShadow, useTokens } from './kit';

/* Streak sheet — opened from the flame icon. Shows the streak itself plus
   the Quick Rest activities, framed as the guilt-free way to keep a streak
   alive on a day when no task is getting done. */

function categoryColor(t: ReturnType<typeof useTokens>, cat: RestTask['category']) {
  switch (cat) {
    case 'Physical': return t.colors.wheel[3];
    case 'Mental': return t.colors.wheel[4];
    case 'Social': return t.colors.wheel[2];
    case 'Nourishment': return t.colors.wheel[3];
    default: return t.colors.wheel[5];
  }
}

function QuickRestChip({ task, onToggle }: { task: RestTask; onToggle: () => void }) {
  const t = useTokens();
  const done = task.completedToday;
  const color = categoryColor(t, task.category);
  return (
    <Pressable onPress={onToggle} accessibilityRole="button" accessibilityState={{ checked: done }} accessibilityLabel={task.name} style={{
      flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 999,
      paddingVertical: 9, paddingHorizontal: 14,
      backgroundColor: done ? color : t.colors.bg.card,
      ...(done ? {} : cardShadow(t.dark)),
    }}>
      <View style={{ width: 20, height: 20, borderRadius: 999, backgroundColor: done ? t.colors.bg.card : color, opacity: done ? 0.9 : 0.35 }} />
      <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 13.5, color: done ? t.colors.text.onInk : t.colors.text.primary }}>
        {task.name}
      </Text>
    </Pressable>
  );
}

export function StreakSheet({ onClose }: { onClose: () => void }) {
  const t = useTokens();
  const { streak, bestStreak, hasActivityToday, restTasks, toggleRestTask } = useApp();
  const quickRest = restTasks.filter((r) => r.isPreset);

  const [justPreserved, setJustPreserved] = useState(false);
  const preservedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleToggle(task: RestTask) {
    const nowDone = !task.completedToday;
    toggleRestTask(task.id);
    if (nowDone && !hasActivityToday) {
      setJustPreserved(true);
      if (preservedTimer.current) clearTimeout(preservedTimer.current);
      preservedTimer.current = setTimeout(() => setJustPreserved(false), 3000);
    }
  }

  return (
    <Sheet onClose={onClose}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <View style={{ width: 44, height: 44, borderRadius: 999, backgroundColor: t.colors.softs.coral, alignItems: 'center', justifyContent: 'center' }}>
          <Flame size={20} color={t.colors.accent.main} strokeWidth={2.2} />
        </View>
        <View>
          <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 22, color: t.colors.text.primary }}>
            {streak}-day streak
          </Text>
          <Text style={{ fontFamily: FONTS.sansLight, fontSize: 13, color: t.colors.text.secondary }}>
            Best so far: {bestStreak} day{bestStreak !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {justPreserved ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.colors.softs.sage, borderRadius: 14, padding: 12, marginTop: 14 }}>
          <Sparkles size={16} color={t.colors.action.success} strokeWidth={2.2} />
          <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 14, color: t.colors.text.primary, flex: 1 }}>
            Your streak is preserved for today.
          </Text>
        </View>
      ) : (
        <Text style={{ fontFamily: FONTS.sansLight, fontSize: 14, lineHeight: 21, color: t.colors.text.secondary, marginTop: 14 }}>
          {hasActivityToday
            ? 'Today already counts. The streak is safe.'
            : 'Nothing logged yet today. A task keeps the streak going — and so does rest.'}
        </Text>
      )}

      <View style={{ marginTop: 20, paddingTop: 18, borderTopWidth: 1, borderTopColor: t.colors.hairline }}>
        <SectionLabel style={{ fontSize: 12, marginBottom: 4 }}>Quick rest</SectionLabel>
        <Text style={{ fontFamily: FONTS.sansLight, fontSize: 13, lineHeight: 19, color: t.colors.text.muted, marginBottom: 12 }}>
          Heavy day? One of these still counts as showing up — no guilt, same streak.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {quickRest.map((task) => (
            <QuickRestChip key={task.id} task={task} onToggle={() => handleToggle(task)} />
          ))}
        </View>
      </View>
    </Sheet>
  );
}
