# Type Fighter

A TypeRacer clone built on the Ethereum BlockChain and making off-chain
computations for instant finality using State Channels. This application 
is modelled as a force move game. Read more [here](https://magmo.com/force-move-games.pdf).

_Work In Progress_

## Requirements

1. Truffle
2. Ganache CLI
3. Node v10.16+

## Setup

```
git clone https://github.com/shb9019/Type-Fighter.git
cd Type-Fighter
```
Start the local blockchain for testing
```
ganache-cli -p 8545 
```
Set config values in `test/config.js`
```
truffle compile
truffle test
```
