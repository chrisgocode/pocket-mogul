import type { MotionPreference, Switch } from '@/domain/settings';
import type { NumberFormatting } from '@/domain/money';
import { useSettings } from '@/features/game/useSettings';
import { Card } from '@/ui/Card';
import { ChoiceRow, type Choice } from '@/ui/ChoiceRow';
import { Section } from '@/ui/Section';
import { SwitchRow } from '@/ui/SwitchRow';

const MOTION_CHOICES: readonly Choice<MotionPreference>[] = [
  { value: 'system', label: 'System' },
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
];

const NUMBER_CHOICES: readonly Choice<NumberFormatting>[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'full', label: 'Full' },
];

const switchedTo = (on: boolean): Switch => (on ? 'on' : 'off');

export function PreferencesSection() {
  const { settings, update } = useSettings();
  return (
    <Section title="Preferences">
      <Card>
        <SwitchRow
          title="Sound"
          note="Game sounds, when there are any to play."
          value={settings.sound === 'on'}
          onChange={(on) => update({ sound: switchedTo(on) })}
        />
        <SwitchRow
          title="Haptics"
          note="A light buzz when you tap the wallet."
          value={settings.haptics === 'on'}
          onChange={(on) => update({ haptics: switchedTo(on) })}
        />
        <ChoiceRow
          title="Reduced motion"
          note="Fades instead of slides, and no shrinking when you press."
          choices={MOTION_CHOICES}
          selected={settings.reducedMotion}
          onSelect={(reducedMotion) => update({ reducedMotion })}
        />
        <ChoiceRow
          title="Number formatting"
          note="Compact shows $1.23M in summaries. Details and confirmations stay exact."
          choices={NUMBER_CHOICES}
          selected={settings.numberFormatting}
          onSelect={(numberFormatting) => update({ numberFormatting })}
        />
      </Card>
    </Section>
  );
}
