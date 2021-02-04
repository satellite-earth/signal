const Torrent = require('@satellite-earth/torrent');


class Signal extends Torrent {

	constructor (payload, signalParams) {

		super(payload);

		const required = [ 'action', 'epoch', 'block' ];

		if (signalParams) { // Compose human-signable consensus and intention

			let consensus;

			if (typeof signalParams.sender !== 'undefined') {

				let _sender = signalParams.sender;
				if (typeof signalParams.namespace === 'string') {
					_sender += `.${signalParams.namespace}`;
				}

				this.sender = signalParams.sender;
				consensus = [ _sender ];

			} else {
				consensus = []
			}

			for (let param of required) {
				if (typeof param === 'undefined') {
					throw Error(`Missing required signal param '${param}'`);
				} else {
					consensus.push(signalParams[param]);
					this[param] = signalParams[param];
				}
			}

			// Optionally set temporal and world params for this signal
			for (let coord of [ 'blockNumber', 'timestamp', 'world', 'namespace' ]) {
				if (typeof signalParams[coord] !== 'undefined') {
					this._params_[coord] = signalParams[coord];
				}
			}

			// Consensus string: "who" > "what" > "where" > "when"
			// ("who" is omitted to indicate an anonymous signal)
			this._signed_['@'] = consensus.join(' > ');

		} else if (this.consensus) { // Parse consensus string

			const params = this.consensus.split(' > ');
			let i = 0;
			
			// If sender is defined, infer namespace. Null
			// value indicates top level contract names.
			if (params.length > 3) {
				const _s = params[0].split('.');
				this._params_.namespace = typeof _s[1] === 'undefined' ? null : _s[1];
				this.authorAlias = _s[0];
				this.sender = _s[0];
				i = 1;
			}

			for (let p = 0; p < required.length; p++) {
				this[required[p]] = params[p + i];
			}
		}
	}

	// Override Message class
	async sign (earth, options = {}) {

		// Add world signer as the EIP-712 domain separator
		await super.sign(earth, this.EIP712Domain, options);

		// Add alias so signal can be applied to local states
		if (typeof this.sender !== 'undefined') {
			this.authorAlias = this.sender;
		}

		return this;
	};

	// Override verify() from Message class
	async verify (earth) {

		// Verify authorship and integrity, adding
		// world name in EIP-712 domain separator
		await super.verify(earth, this.EIP712Domain);

		// Check that explicit 'sender' matches verified author
		if (typeof this.sender !== 'undefined' && this.sender !== this.authorAlias) {
			throw Error('Signal param \'sender\' does not match verified author alias');
		}

		return this;
	}

	// Override verifySync() from Message class
	verifySync (earth) {

		// Verify authorship and integrity, adding
		// world name as EIP-712 domain separator
		super.verifySync(earth, this.EIP712Domain);

		// Check that explicit 'sender' matches verified author
		if (typeof this.sender !== 'undefined' && this.sender !== this.authorAlias) {
			throw Error('Signal param \'sender\' does not match verified author alias');
		}

		return this;
	}

	// Populate blockNumber and timestamp asynchronously
	async locate (eth) {

		if (typeof this.block === 'undefined') { // Must have signed blockhash
			throw Error('Cannot locate if signal \'block\' is undefined');
		}

		if (!clock.readHash) {
			throw Error('Missing eth interface function \'getBlock\'')
		}

		// Get block data directly from blockchain
		const data = await eth.getBlock(this.block);
		return this.coordinate(data);
	}

	// Populate blockNumber and timestamp synchronously
	locateSync (clock, confirm) {

		if (!clock) { // Earth API instance is needed to access clock
			throw Error('Must provide Earth API instance');
		}

		if (typeof this.block === 'undefined') { // Must haved signed blockhash
			throw Error('Cannot locate if signal \'block\' is undefined');
		}

		if (!clock.readHash) {
			throw Error('Missing clock interface function \'readHash\'')
		}

		// Get block data from Earth's internal clock
		const data = clock.readHash(this.block, confirm);
		return this.coordinate(data);
	}

	coordinate (coords = {}) {

		if (typeof this.blockNumber === 'undefined') {				
			this._params_.blockNumber = coords.number;
		} else if (this.blockNumber !== coords.number) {
			throw Error('Signal block number does not match claimed value');
		}

		if (typeof this.timestamp === 'undefined') {				
			this._params_.timestamp = coords.timestamp;
		} else if (this.timestamp !== coords.timestamp) {
			throw Error('Signal timestamp does not match claimed value');
		}

		return this;
	}

	address () {
		return super.address(this.EIP712Domain);
	}

	// Unambgiously determine sort order with respect to another signal
	compare (that) {

		if (!(this.located && that.located)) {
			throw Error('Cannot compare signals without blockNumber or timestamp param');
		}

		// Try to compare by block number
		let i0 = this.blockNumber;
		let i1 = that.blockNumber;

		// If blockNumber params not defined, try using timestamp
		if (typeof i0 === 'undefined' || typeof i1 === 'undefined') {
			i0 = this.timestamp;
			i1 = that.timestamp;
		}

		// Sort ascending, cotemporal signals falling
		// back to use Message class uuid comparison
		return i0 === i1 ? super.compare(that) : i0 - i1;
	}

	clearLocation () {
		const keep = {};
		for (let key of Object.keys(this._params_)) {
			if (key !== 'timestamp' && key !== 'blockNumber') {
				keep[key] = this._params_[key];
			}
		}
		this._params_ = keep;
	}

	clearCustomParams () {
		const keep = {};
		const standardKeys = Object.keys(this.standardParams);
		for (let key of Object.keys(this._params_)) {
			if (standardParams.indexOf(key) !== -1) {
				keep[key] = this._params_[key];
			}
		}
		this._params_ = keep;
	}

	get standardParams () {
		return {
			sig: this._params_.sig,
			alias: this._params_.alias,
			world: this._params_.world,
			timestamp: this._params_.timestamp,
			blockNumber: this._params_.blockNumber
		};
	}

	get customParams () {
		const standardKeys = Object.keys(this.standardParams);
		const customParams = {};
		for (let key of Object.keys(this._params_)) {
			if (standardKeys.indexOf(key) === -1) {
				customParams[key] = this._params_[key];
			}
		}
		return customParams;
	}

	get contained () { // Convenience method returns non-parameter signed data

		const c = {};
		
		for (let key of this.keys) {
			if (key !== '@') {
				c[key] = this._signed_[key];
			}
		}

		return c;
	}

	get payload () {
		return {
			_signed_: this._signed_,
			_params_: this._params_
		};
	}

	get world () {
		return this._params_.world;
	}

	get namespace () {
		return this._params_.namespace;
	}

	get blockNumber () {

		if (typeof this._params_.blockNumber === 'undefined') {
			return;
		}

		return parseInt(this._params_.blockNumber);
	}

	get timestamp () {

		if (typeof this._params_.timestamp === 'undefined') {
			return;
		}

		return parseInt(this._params_.timestamp);
	}

	get located () {
		return typeof this.timestamp !== 'undefined'
		|| typeof this.blockNumber !== 'undefined';
	}


	get dropped () {

		if (typeof this._params_.dropped === 'undefined') {
			return;
		}

		return parseInt(this._params_.dropped)
	}

	get consensus () {
		return this._signed_['@'];
	}

	get EIP712Domain () {
		return [{
			name: 'name',
			type: 'string',
			value: this.world
		}];
	}
}

module.exports = Signal;
