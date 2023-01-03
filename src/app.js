import './lib/x-action.js';
import { query } from './lib/x-controller.js';

import './style.css';

// data ver 10.03
// https://docs.google.com/spreadsheets/d/1ShT8I1wj9mGh-hGXqF0j9tvUU_jkYLvGd4gPZjNzRpo/edit?usp=sharing
const { default: data } = await import('./data.js');


class AppElement extends HTMLElement {
	/** @type {HTMLInputElement} */
	searchField = query(this, 'searchField');
	/** @type {HTMLUListElement} */
	autocompleteContainer = query(this, 'autocompleteContainer');
	/** @type {HTMLUListElement} */
	augmentsContainer = query(this, 'augmentsContainer');
	/** @type {HTMLFormElement} */
	displayContainer = query(this, 'displayContainer');
	/** @type {HTMLSpanElement} */
	commitHash = query(this, 'commitHash');

	/** @type {HTMLLIElement[]} */
	searchResults = [];
	searchIndex = -1;
	searchInitialized = false;
	searchDirty = false;

	/** @type {string[]} */
	augments;

	connectedCallback () {
		const searchParams = new URLSearchParams(location.search);
		const augments = searchParams.get('augments')?.split(',') || [];

		this.augments = augments;

		this.commitHash.textContent = COMMIT_HASH;

		this.calculate();
		this._initializeSearch();
	}

	calculate () {
		const augments = this.augments;

		const { scores, unknowns } = calculateStats(augments);
		const keys = Object.keys(scores);

		for (let idx = 0, len = keys.length; idx < len; idx++) {
			const key = keys[idx];

			const unknown = unknowns[key];
			const score = scores[key];

			const formatted = (/pot|resist|crit|drop/).test(key)
				? `${score.toFixed(2)}%`
				: score;

			const field = document.getElementById(key);
			const header = field.previousElementSibling;

			const isHighlighted = !!(score || unknown);

			header.classList.toggle('highlight', isHighlighted);
			field.classList.toggle('highlight', isHighlighted);
			field.textContent = `${formatted}${unknown ? ' ?' : ''}`;
		}

		const container = this.augmentsContainer;
		const nodes = [...container.childNodes];

		let index = 0;

		for (; index < augments.length; index++) {
			const augment = augments[index];
			const map = data[augment];

			let node = nodes[index];

			if (!map) {
				continue;
			}

			if (node) {
				node.textContent = map.name;
				node.dataset.value = augment;
				continue;
			}

			node = document.createElement('li');

			node.textContent = map.name;
			node.dataset.value = augment;
			node.tabIndex = 0;

			node.setAttribute('x-action', 'click:x-app#handleAugmentClick keydown:x-app#handleAugmentKeydown');

			container.appendChild(node);
		}

		for (; index < nodes.length; index++) {
			let node = nodes[index];
			node.remove();
		}
	}

	/**
	 * @param {PointerEvent} event
	 */
	handleAugmentClick (event) {
		const target = event.target;
		const value = target.dataset.value;

		const augments = this.augments;
		const index = augments.indexOf(value);

		if (index !== -1) {
			augments.splice(index, 1);

			this._replaceUrl();
			this.calculate();

			this.searchDirty = true;
		}
	}

	handleAugmentKeydown (event) {
		const key = event.key;

		const isEnter = key === 'Enter';

		if (isEnter) {
			this.handleAugmentClick(event);
		}
	}

	/**
	 * @param {KeyboardEvent} event
	 */
	handleSearchKeydown (event) {
		const target = event.currentTarget;
		const key = event.key;

		const results = this.searchResults;
		const index = this.searchIndex;

		const isArrowUp = key === 'ArrowUp';
		const isArrowDown = key === 'ArrowDown';
		const isEnter = key === 'Enter';
		const isEscape = key === 'Escape';

		if (isEscape) {
			const parent = target.parentNode;
			parent.classList.add('escaped');
		}
		else if (isEnter) {
			if (index > -1) {
				const option = results[index];
				option.click();
			}
		}
		else if (isArrowUp || isArrowDown) {
			event.preventDefault();

			const length = results.length;

			const delta = isArrowUp ? -1 : 1;
			let nextIndex = index + delta;

			if (nextIndex < 0) {
				nextIndex = length - 1;
			}
			else if (nextIndex >= length) {
				nextIndex = length ? 0 : -1;
			}

			if (index !== -1) {
				results[index].classList.remove('selected');
			}

			if (nextIndex !== -1) {
				const el = results[nextIndex];

				el.classList.add('selected');
				el.scrollIntoView({ block: 'nearest' });
			}

			this.searchIndex = nextIndex;
		}
	}

	/**
	 * @param {KeyboardEvent} event
	 */
	handleSearchInput (event) {
		const dirty = this.searchDirty;

		const target = event.target;
		const parent = target.parentNode;

		const prevQuery = target.dataset.query;
		const nextQuery = target.value.trim().toLowerCase();

		if (prevQuery === nextQuery && !dirty) {
			return;
		}

		const container = this.autocompleteContainer;
		const nodes = (!dirty && prevQuery && nextQuery.startsWith(prevQuery))
			? this.searchResults
			: container.childNodes;

		const results = [];

		parent.classList.remove('escaped');

		for (let idx = 0, len = nodes.length; idx < len; idx++) {
			const option = nodes[idx];
			const dataset = option.dataset;

			const match = (
				nextQuery &&
				!this.augments.includes(dataset.value) &&
				option.textContent.toLowerCase().includes(nextQuery)
			);

			option.style.setProperty('display', match ? '' : 'none');

			if (match) {
				results.push(option);
			}
		}

		target.dataset.query = nextQuery;
		container.classList.toggle('empty', !results.length);

		const index = this.searchIndex;

		if (index !== -1) {
			this.searchResults[index].classList.remove('selected');
		}

		this.searchIndex = -1;
		this.searchResults = results;
	}

	/**
	 * @param {FocusEvent} event
	 */
	handleSearchFocusIn (event) {
		const target = event.currentTarget;
		target.classList.remove('escaped');

		if (this.searchDirty) {
			this.handleSearchInput(event);
			this.searchDirty = false;
		}
	}

	/**
	 * @param {PointerEvent} event
	 */
	handleSearchItemClick (event) {
		const target = event.target;
		const value = target.dataset.value;

		const results = this.searchResults;
		const index = results.indexOf(target);

		target.style.setProperty('display', 'none');
		target.classList.remove('selected');

		let isEmpty = false;

		if (index !== -1) {
			results.splice(index, 1);

			if (isEmpty = !results.length) {
				this.autocompleteContainer.classList.add('empty');
			}
		}

		this.searchIndex = isEmpty ? -1 : 0;
		this.searchField.focus();

		if (!isEmpty) {
			const node = results[0];
			node.classList.add('selected');
			node.scrollIntoView({ block: 'nearest' });
		}

		// this replaceState doesn't trigger any updates to the store, I think we're
		// better off like this than trying to parse the search params again,
		// especially since it's only being used for augments right now.

		const augments = this.augments;

		augments.push(value);

		this._replaceUrl();
		this.calculate();
	}

	_initializeSearch () {
		if (this.searchInitialized) {
			return;
		}

		this.searchInitialized = true;

		const container = this.autocompleteContainer;
		const keys = Object.keys(data);

		for (let idx = 0, len = keys.length; idx < len; idx++) {
			const key = keys[idx];
			const item = data[key];
			const li = document.createElement('li');

			li.style.setProperty('display', 'none');
			li.setAttribute('x-action', 'click:x-app#handleSearchItemClick');

			li.textContent = `${item.name}`;
			li.dataset.bp = item.bp || '0';
			li.dataset.value = key;
			li.dataset.idx = idx;

			container.appendChild(li);
		}
	}

	_replaceUrl () {
		const joined = this.augments.join(',');

		history.replaceState(null, '', joined ? `?augments=${joined}` : '?');
	}
}

customElements.define('x-app', AppElement);

function calculateStats (augments) {
	const scores = createStatsObject(0);
	const unknowns = createStatsObject(false);

	for (let i = 0, il = augments.length; i < il; i++) {
		const augment = augments[i];

		if (!(augment in data)) {
			continue;
		}

		const obj = data[augment];
		const keys = Object.keys(obj);

		for (let j = 0, jl = keys.length; j < jl; j++) {
			const key = keys[j];
			const value = obj[key];

			if (key === 'name') {
				continue;
			}

			if (value === '?') {
				unknowns[key] = true;
			}
			else {
				scores[key] += value;
			}
		}
	}

	return { scores, unknowns };
}

function createStatsObject (default_value) {
	return {
		bp: default_value,
		hp: default_value,
		pp: default_value,
		exp_grind: default_value,
		mel_pot: default_value,
		rng_pot: default_value,
		tec_pot: default_value,
		pot_floor: default_value,
		dmg_resist: default_value,
		burn_resist: default_value,
		freeze_resist: default_value,
		shock_resist: default_value,
		blind_resist: default_value,
		panic_resist: default_value,
		poison_resist: default_value,
		pain_resist: default_value,
		all_resist: default_value,
		low_temp_resist: default_value,
		fire_pot: default_value,
		ice_pot: default_value,
		lightning_pot: default_value,
		wind_pot: default_value,
		light_pot: default_value,
		dark_pot: default_value,
		daytime_pot: default_value,
		nighttime_pot: default_value,
		seasonal_pot: default_value,
		seasonal_crit: default_value,
		seasonal_drop: default_value,
	};
}
