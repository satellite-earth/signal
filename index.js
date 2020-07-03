
const Torrent = require('@satellite-earth/dev-torrent');

class Signal extends Torrent {

	constructor (payload, signalParams) {

		super(payload);

		if (signalParams) { // Compose human-signable consensus and intention
			
			// Set fundamental parameters common to all signals
			for (let param of [ 'sender', 'action', 'epoch', 'block' ]) {
				if (typeof param === 'undefined') {
					throw Error(`Missing required signal param '${param}'`);
				}
			}

			// Assign signal params
			this.sender = signalParams.sender;
			this.action = signalParams.action;
			this.epoch = signalParams.epoch;
			this.block = signalParams.block;

			// Optionally set temporal and world params for this signal
			for (let coord of [ 'blockNumber', 'timestamp', 'world' ]) {
				if (typeof signalParams[coord] !== 'undefined') {
					this._params_[coord] = signalParams[coord];
				}
			}

			// Construct consensus string: "who" > "what" > "where" > "when"
			this._signed_['@'] = `${this.sender} > ${this.action} > ${this.epoch} > ${this.block}`;

		} else if (this.consensus) { // Parse consensus string
			const sp = this.consensus.split(' > ');
			this.sender = sp[0];
			this.action = sp[1];
			this.epoch = sp[2];
			this.block = sp[3];
		}
	}

	// Override Message class signature to add alias name
	// of world signer as the EIP-712 domain separator
	async sign (earth) {

		return await super.sign(earth, [{
			name: 'name',
			type: 'string',
			value: this.world
		}]);
	};

	// Override verify() from Message class
	async verify (earth) {

		if (typeof this.sender === 'undefined') {
			throw Error('Cannot verify if signal \'sender\' is undefined');
		}

		// Verify authorship and integrity, adding
		// world name in EIP-712 domain separator
		await super.verify(earth, [{
			name: 'name',
			type: 'string',
			value: this.world
		}]);

		// Check that explicit 'sender' matches verified author
		if (this.sender !== this.authorAlias) {
			throw Error('Signal param \'sender\' does not match verified author alias');
		}

		return this;
	}

	// Override verifySync() from Message class
	verifySync (earth, blockNumber) {

		if (typeof this.sender === 'undefined') {
			throw Error('Cannot verify if signal \'sender\' is undefined');
		}

		// Verify authorship and integrity, adding
		// world name as EIP-712 domain separator
		super.verifySync(earth, blockNumber, [{
			name: 'name',
			type: 'string',
			value: this.world
		}]);

		// Check that explicit 'sender' matches verified author
		if (this.sender !== this.authorAlias) {
			throw Error('Signal param \'sender\' does not match verified author alias');
		}

		return this;
	}

	// Populate blockNumber and timestamp asynchronously
	async locate (earth) {

		if (!earth) { // Earth API instance is needed to access blockchain
			throw Error('Must provide Earth API instance');
		}

		if (typeof this.block === 'undefined') { // Must have signed blockhash
			throw Error('Cannot locate if signal \'block\' is undefined');
		}

		// Get block data directly from blockchain
		const info = await earth.web3.eth.getBlock(this.block);

		if (info) {
			const params = { blockNumber: info.blockNumber, timestamp: info.timestamp };
			this.addParams(params);
			return params;
		} else {
			this.clearLocation();
		}

		return this;
	}

	// Populate blockNumber and timestamp asynchronously
	locateSync (earth, confirm) {

		if (!earth) { // Earth API instance is needed to access clock
			throw Error('Must provide Earth API instance');
		}

		if (typeof this.block === 'undefined') { // Must haved signed blockhash
			throw Error('Cannot locate if signal \'block\' is undefined');
		}

		// Get block data from Earth's internal clock
		const info = earth.clock.readHash(this.block, confirm);

		if (info) {
			const params = { blockNumber: info.number, timestamp: info.timestamp };
			this.addParams(params);
			return params;
		} else {
			this.clearLocation();
		}

		return this;
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
			_params_: {
				sig: this._params_.sig,
				alias: this._params_.alias,
				world: this._params_.world,
				timestamp: this._params_.timestamp,
				blockNumber: this._params_.blockNumber
			}
		};
	}

	get world () {
		return this._params_.world;
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
}

module.exports = Signal;
