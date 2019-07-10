# gnosis-s2g-mvp


# About

This is a proof of concept implementation which shows how to set up and use a [Gnosis Safe](https://github.com/gnosis/safe-contracts) with [Infineon Security2Go Smart Cards](https://github.com/infineon/blockchain) as owners.  
Development was supported by the [Gnosis Ecosystem Fund](https://github.com/gnosis/GECO), see the ["Multicard" application](https://github.com/gnosis/GECO/blob/master/Proposals/Funded%20Projects/MultiCard.md).

The application consists of a local webserver that connects to a local NFC reader (see requirements).  
the Web UI guides you through different steps of the lifetime of a Safe:
-   Deploying a new Safe from scratch
-   Initializing a set of owners for multisig
-   Funding that Safe with 1 unit of native currency
-   Getting out 0.1 units of native currency using a Safe transaction with multiple signatures

# Requirements

- A NFC Card reader that is supported by [PCSC lite](https://pcsclite.apdu.fr/)
- Access to an Ethereum compatible blockchain - we use [ARTIS](https://artis.eco) tau1 (testnet) in this example
- At least one Security2Go NFC Card (3 recommended - 1 for setting up and funding the Safe, 2 for multisig)
    -   with address at index 1 initialised
    -   with some funding (at least 1.5 ATS for ARTIS)
- Linux OS - tested with Ubuntu 18 LTS - but most other common Linux distros should do as well
- libudev and libusb 1.0.8 or later
- [Node.js](https://nodejs.org/en/) v10 LTS (tested with v10.15.3)
- [NPM](https://www.npmjs.com/get-npm) (tested with v6.4.1)

# Build and run


```
npm ci
npm start
```

This pops up a web server on port 3000.  
Navigate to http://localhost:3000 in a browser of your choice and follow the instructions.
