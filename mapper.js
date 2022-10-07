import fs from 'node:fs/promises';
import json5 from 'json5';


const source = await fs.readFile('./data.json', 'utf-8');
const json = JSON.parse(source);

const mapped = {};

for (const augment of json) {
	const key = augment['Name'].toLowerCase().replaceAll(' ', '_');

	if (key === 'none') {
		continue;
	}

	mapped[key] = {
		name: augment['Name'],
		bp: convert(augment['BP']),
		hp: convert(augment['HP']),
		pp: convert(augment['PP']),
		mel_pot: convert(augment['MEL Pot%']),
		rng_pot: convert(augment['RNG Pot%']),
		tec_pot: convert(augment['TEC Pot%']),
		pot_floor: convert(augment['Pot Floor%']),
		dmg_resist: convert(augment['Dmg Resist%']),
		burn_resist: convert(augment['Burn Resist%']),
		freeze_resist: convert(augment['Freeze Resist%']),
		shock_resist: convert(augment['Shock Resist%']),
		blind_resist: convert(augment['Blind Resist%']),
		panic_resist: convert(augment['Panic Resist%']),
		poison_resist: convert(augment['Poison Resist%']),
		pain_resist: convert(augment['Pain Resist%']),
		all_resist: convert(augment['All Resist%']),
		low_temp_resist: convert(augment['Low Temp Resist%']),
		exp_grind: convert(augment['EXP Grind']),
		fire_pot: convert(augment['Fire Pot%']),
		ice_pot: convert(augment['Ice Pot%']),
		lightning_pot: convert(augment['Lightning Pot%']),
		wind_pot: convert(augment['Wind Pot%']),
		light_pot: convert(augment['Light Pot%']),
		dark_pot: convert(augment['Dark Pot%']),
		daytime_pot: convert(augment['Daytime Pot%']),
		nighttime_pot: convert(augment['Nighttime Pot%']),
		seasonal_pot: convert(augment['Seasonal Potency%']),
		seasonal_crit: convert(augment['Seasonal Crit%']),
		seasonal_drop: convert(augment['Seasonal DR%']),
	};
}

const result = json5.stringify(mapped, null, '\t');
await fs.writeFile('./src/data.js', `export default ${result};\n`);


function convert (nstr) {
	if (!nstr) {
		return undefined;
	}

	if (nstr === '?') {
		return nstr;
	}

	if (nstr.endsWith('%')) {
		nstr = nstr.slice(0, -1);
	}

	const nmbr = parseFloat(nstr);
	return nmbr === 0 ? undefined : nmbr;
}
