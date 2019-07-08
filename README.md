# gnosis-s2g-mvp

Using Infineon Security2Go smartcard to sign multisig transactions for a gnosis safe.
A minimal viable product to deliver a proof of concept for using those Infineon Security2Go smart cards for interacting with gnosis safe.
for more details, [check out the details](https://github.com/gnosis/GECO/pull/27)

# about

The project pops up a local webserver that connects to a local NFC reader (see prerequesites) to allow you to create and interact with a [Gnosis Safe](https://github.com/gnosis/safe-contracts)
the WebUI guides you through different steps of the lifetime of a safe.
-   Deploying a new Safe from the scratch.
-   Defining a set of Smartcards for multisig.
-   Funding that Safe with 1 unit of native currency.
-   Getting out 0.1 units of native currency using multisig again.

# prerequisites

- A NFC Card reader that is supported by [PCSC lite](https://pcsclite.apdu.fr/)
- Access to an Ethereum compatible blockchain (we use [ARTIS](https://artis.eco) in this example), but this can also be a truffle development chain as well.
- At minimum one Security2Go NFC Card
    -   with address 1 initialised
    -   with some funding (at minimum 1.5 ATS (in the case of ARTIS))
    -   for a better experience 3 NFC Cards are adviced. (1 for setting up and funding the save, 2 for multisig)
- Linux OS (Tested with Ubuntu 18 LTS - but most other common Linux ditros should do as well. requirement: libudev and libusb 1.0.8 or later)
- [Node](https://nodejs.org/en/) v10 LTS (tested with v10.15.3) - other versions could work as well.
- [NPM](https://www.npmjs.com/get-npm) for making the install easier (tested with v6.4.1)

# build and run

`npm i`
`npm start`

this pops up a Webserver on port 3000 and a webui can be reached on http://localhost:3000
