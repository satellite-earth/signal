View full documentation at https://docs.satellite.earth/

## Usage

``` js
const Signal = require('@satellite-earth/signal');

const signal = new Signal({
	subject: 'Comment Example',
	message: 'This is my comment. . .'
}, {
	sender: 'alice',
	action: 'comment',
	epoch: '4ab983d73d502bd027e97cdba7fcad7e695fd514',
	block: '0x4fd88744a17756b7d0894f1b58f194fe4e8b23182559989f515dadac3163d64e',
	world: 'satellite'
});
```

**Constructor**

1. `Object` - Signal payload
2. `Object` - Signal params
	- `sender` - `String` - Alias name of sender
	- `action` - `String` - Action name
	- `epoch` - `String` -  The previous world epoch's `uuid`
	- `block` - `String` - Hash of the Ethereum block used for timestamp
	- `world` - `String` - Alias name of epoch signer

## Properties

### sender

``` js
signal.sender // 'alice'
```

`String` - The alias name of the signal sender

---

### action

``` js
signal.action // 'comment'
```

`String` - The action name (e.g. "comment", "seed", "publish", "block") that the indicates how the signal signed intends to change the state of its target world.

---

### epoch

``` js
signal.epoch // '4ab983d73d502bd027e97cdba7fcad7e695fd514'
```

`String` - the previous world epoch's `uuid`. This gives the signal signer the ability to indicate explicitly that they believe the last epoch was "real" in the sense that it should be included in the ongoing chain of epochs that comprise a given world. This is exactly analogous to how blocks in a blockchain sign the hash of the previous block. If no epochs of a world yet exists (i.e. the signal is meant to be included in epoch number `0`, this value is `genesis`).

---

### block

``` js
signal.block // '0x4fd88744a17756b7d0894f1b58f194fe4e8b23182559989f515dadac3163d64e'
```

`String` - Hash of the Ethereum block that the signal will use to timestamp itself. The reason that a block hash, as opposed to a conventional timestamp (i.e. \*nix time) is not used is because block hashes are unpredictable, making it effectively impossible to "post date" a signal. This is a security feature. For more information, see docs for [Clock](/clock).

---

### world

``` js
signal.world // 'satellite'
```

`String` - Alias name of epoch signer. This value is used as part of the domain separator as per [EIP-712](https://eips.ethereum.org/EIPS/eip-712) to ensure that signals may only be included in an epoch if the author/sender of the signal has explicitly recognized the epoch signer's right to do so.

---

### standardParams

``` js
signal.standardParams
```

`Object` - Standard parameters common to all signals

- `sig` - `String` - User's signature
- `alias` - `String` - User's alias name
- `world` - `String` - Alias name of epoch signer
- `timestamp` - `Number` - Unix timestamp (from block timestamp)
- `blockNumber` - `Number` - Block number

---

### customParams

``` js
signal.customParams
```

`Object` - Non-standard data in the `_params_` object

---

### contained

``` js
signal.contained
```

`Object` - Data in the `_signed_` object, excluding consensus string

---

### payload

``` js
signal.payload
```

`Object` - Object containing `_signed_` and standard signal `_params_`. Overrides `payload` from Message superclass.

---

### blockNumber

``` js
signal.blockNumber // 10190026
```

`Number` - Block number of the Ethereum block whose hash was signed in the signal

---

### timestamp

``` js
signal.timestamp // 1591149129
```

`Number` - Timestamp of the Ethereum block whose hash was signed in the signal

---

### located

``` js
signal.located // true
```

`Boolean` - If signal `blockNumber` or `timestamp` are defined, (i.e. if the block whose has was signed was detected)

---

### dropped

``` js
signal.dropped // false
```

`Boolean` - Convenience accessor for `_params_.dropped`

---

### consensus

``` js
signal.consensus // alice > comment > 4ab983d73d502bd027e97cdba7fcad7e695fd514 > 0x4fd88744a17756b7d0894f1b58f194fe4e8b23182559989f515dadac3163d64e
```

`String` - Special signed value containing signal params. This "consensus" string is common to all signals.

## Methods

### sign

``` js
try {

	// Prompt user to sign signal
	await signal.sign(earth);

} catch (err) {
	// User rejected signature request
}
```

Prompt user to sign signal in the browser. Overrides method on [Message](/message) superclass to include `world` as the [EIP-712](https://eips.ethereum.org/EIPS/eip-712) domain separator.

**Parameters**

1. `Earth` - Earth API instance

**Returns**

`Promise` returns `this` - Reference to self allows method chaining

---

### verify

``` js
try {

	// Attempt to verify
	await signal.verify(earth);

} catch (err) {
	// Failed to verify
}
```

Verify integrity, authorship, and context of signal asynchronously by referencing the blockchain. Overrides method on [Message](/message) superclass to include `world` as the [EIP-712](https://eips.ethereum.org/EIPS/eip-712) domain separator.

**Parameters**

1. `Earth` - Earth API instance

**Returns**

`Promise` returns `this` - Reference to self allows method chaining

---

### verifySync

``` js
try {

	// Attempt to verify
	signal.verifySync(earth, 10190026);

} catch (err) {
	// Failed to verify
}
```

Verify integrity, authorship, and context of signal synchronously by referencing Earth's internal alias directory. The second parameter is the block number at which to verify authorship. This is important because users can change the address linked to their alias name. Useful for historical verification of signals. Overrides method on [Message](/message) superclass to include `world` as the [EIP-712](https://eips.ethereum.org/EIPS/eip-712) domain separator.

**Parameters**

1. `Earth` - Earth API instance
2. `Number` - (optional) Block number at which to verify authorship (default latest block synced in directory)

**Returns**

`this` - Reference to self allows method chaining

---

### locate

``` js
// Detect when signal was signed
// by referencing blockchain
await signal.locate(earth);

console.log(signal.blockNumber); // 10190026
console.log(signal.timestamp); // 1591149129
```

Establish `blockNumber` and `timestamp` by looking up the block from Ethereum that matches the included hash. 

**Parameters**

1. `Earth` - Earth API instance

**Returns**

`Promise` returns `this` - Reference to self allows method chaining

---

### locateSync

``` js
// Detect when signal was signed
// by referencing internal clock
signal.locateSync(earth);

console.log(signal.blockNumber); // 10190026
console.log(signal.timestamp); // 1591149129
```

Establish `blockNumber` and `timestamp` by looking up the block from Earth's internal clock that matches the included hash. 

**Parameters**

1. `Earth` - Earth API instance
2. `Number` - (optional) Number of blocks between signed block and maximum synced block required to locate signal. Default `0`

**Returns**

`this` - Reference to self allows method chaining

---

### compare

``` js

```

Get the relative sort position of this signal as compared to another. Overrides method on [Message](/message) superclass to sort by time, falling back to `uuid` comparison. It's important that signals packed into an epoch have a deterministic sort order to ensure that epochs can be unambiguously reconstructed.

**Parameters**

``` js
[ signal, otherSignal ].sort((a, b) => {
	return a.compare(b);
}); 
```

**Returns**

---

### clearLocation

``` js
signal.clearLocation();
```

Remove `blockNumber` and `timestamp` params from signal.
