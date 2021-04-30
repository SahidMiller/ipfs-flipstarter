const { expect, test, describe } = require('@jest/globals')
const request = require('supertest')
const { TextDecoder, TextEncoder } = require('util');
const moment = require('moment')

global.TextDecoder = TextDecoder
global.TextEncoder = TextEncoder


jest.mock("bitbox-sdk")
jest.mock("@bitcoin-dot-com/bitcoincashjs2-lib")
jest.mock("../../src/assurance.js")

const { BITBOX } = require("bitbox-sdk")
const { ECSignature } = require("@bitcoin-dot-com/bitcoincashjs2-lib")
BITBOX.mockImplementation(() => {
    return {
        ECPair: {
            verify: jest.fn().mockReturnValue("verified"),
            fromPublicKey: jest.fn()
        },
        Crypto: {
            sha256: jest.fn().mockReturnValue(Buffer.from("test_hash", "utf8"))
        },
        Address: {
            fromOutputScript: jest.fn()
        }
    }
})

ECSignature.parseScriptSignature.mockReturnValue({ signature: "" })

const router = require('../../routes/submit')

const { urlencoded, json } = require("body-parser");
const express = require('express')

describe("submit", () => {

    test("it returns 400 if no campaign is found", async () => {
        const app = express()

        app.use("/submit", router)
        
        app.debug = {
            server: jest.fn(),
            object: jest.fn()
        }

        app.queries = {
            getCampaign: {
                get: jest.fn().mockReturnValue()
            }
        }
        
        const req = request(app)
        const response = await req.post('/submit/1')

        expect(response.status).toBe(400)
    })

    test("it returns 400 if campaign is fullfilled", async () => {
        const app = express()

        app.use("/submit", router)
        
        app.debug = {
            server: jest.fn(),
            object: jest.fn()
        }

        app.queries = {
            getCampaign: {
                get: jest.fn().mockReturnValue({
                    fullfillment_id: 1
                })
            }
        }
        
        const req = request(app)
        const response = await req.post('/submit/1')

        expect(response.status).toBe(400)
    })

    test("it returns 400 if campaign is expired", async () => {
        const app = express()

        app.use("/submit", router)
        
        app.debug = {
            server: jest.fn(),
            object: jest.fn()
        }

        app.queries = {
            getCampaign: {
                get: jest.fn().mockReturnValue({
                    expires: moment().subtract(1, 'days').unix()
                })
            }
        }
        
        const req = request(app)
        const response = await req.post('/submit/1')

        expect(response.status).toBe(400)
    })

    test("it returns 400 if campaign hasn't started", async () => {
        const app = express()

        app.use("/submit", router)
        
        app.debug = {
            server: jest.fn(),
            object: jest.fn()
        }

        app.queries = {
            getCampaign: {
                get: jest.fn().mockReturnValue({
                    expires: moment().add(2, 'days').unix(),
                    starts: moment().add(1, 'days').unix()
                })
            }
        }
        
        const req = request(app)
        const response = await req.post('/submit/1')

        expect(response.status).toBe(400)
    })

    test("it returns 400 if campaign recipients are not contributors", async () => {
        const app = express()

        app.use("/submit", router)
        
        app.debug = {
            server: jest.fn(),
            object: jest.fn()
        }

        app.queries = {
            getCampaign: {
                get: jest.fn().mockReturnValue({
                    starts: moment().subtract(1, 'days').unix(),
                    expires: moment().add(2, 'days').unix(),
                })
            },
            listRecipientsByCampaign: {
                all: jest.fn().mockReturnValue([])
            },
            addUser: {
                run: jest.fn()
            }
        }
        
        app.config = {
            auth: {
                type: "pending-contributions",
                validAuthCampaigns: [],
            }
        }

        const req = request(app)
        const response = await req.post('/submit/1')

        expect(response.status).toBe(400)
        expect(response.body.error).toContain("is suspended")
        expect(app.queries.addUser.run).toBeCalledTimes(0)
    })

    test("it adds a contribution and calls sse event", async () => {
        const app = express()
        app.use(urlencoded({ extended: true }));
        app.use(json());
        
        app.use("/submit", router)
        
        app.debug = {
            server: jest.fn(),
            object: jest.fn()
        }

        const expectedContribution = {
            user_id: 1,
            campaign_id: 1,
            contribution_comment: "",
            contribution_timestamp: moment().unix()
        }

        app.queries = {
            getCampaign: {
                get: jest.fn().mockReturnValue({
                    starts: moment().subtract(1, 'days').unix(),
                    expires: moment().add(2, 'days').unix(),
                })
            },
            listRecipientsByCampaign: {
                all: jest.fn().mockReturnValue([{
                    recipient_satoshis: 1000,
                    user_address: "bchtest:qq2ckhgcz4fvna8jvlqdu692ujtrqsue8yarpm648v"
                }])
            },
            getCommitmentsByAddress: {
                all: jest.fn().mockReturnValue([
                    { campaign_id: 1 }
                ])
            },
            addUser: {
                run: jest.fn().mockReturnValue({
                    lastInsertRowid: 1
                })
            },
            addContributionToCampaign: {
                run: jest.fn().mockReturnValue({
                    lastInsertRowid: 1
                })
            },
            linkCommitmentToContribution: {
                run: jest.fn()
            },
            getContribution: {
                get: jest.fn().mockReturnValue(expectedContribution)
            },
            getCampaignCommittedSatoshis: {
                get: jest.fn().mockReturnValue(0)
            },
            countCommitmentsByCampaign: {
                get: jest.fn().mockReturnValue(1)
            }
        }
        
        app.sse = {
            event: jest.fn()
        }

        app.config = {
            auth: {
                type: "pending-contributions",
                //Make sure we have a valid auth campaign
                validAuthCampaigns: [1],
            },
            bch: {
                targetFeeRate: 1
            }
        }

        const req = request(app)
        const response = await req.post('/submit/1').send({
            data: {
                inputs: [],
                amount: 0
            }
        })

        expect(response.status).toBe(200)
        expect(app.queries.addUser.run).toBeCalledTimes(1)
        expect(app.queries.linkCommitmentToContribution.run).toBeCalledTimes(0)
        expect(app.sse.event).toHaveBeenNthCalledWith(1, "1", "contribution", expectedContribution)
    })

    test("it calls completes the campaign if amount contributed equals requested", async () => {
        const app = express()
        app.use(urlencoded({ extended: true }));
        app.use(json());
        
        app.use("/submit", router)
        
        app.debug = {
            server: jest.fn(),
            object: jest.fn(),
            action: jest.fn()
        }

        const expectedContribution = {
            user_id: 1,
            campaign_id: 1,
            contribution_comment: "",
            contribution_timestamp: moment().unix()
        }

        app.queries = {
            getCampaign: {
                get: jest.fn().mockReturnValue({
                    starts: moment().subtract(1, 'days').unix(),
                    expires: moment().add(2, 'days').unix(),
                })
            },
            listRecipientsByCampaign: {
                all: jest.fn().mockReturnValue([{
                    recipient_satoshis: 1000,
                    user_address: "bchtest:qq2ckhgcz4fvna8jvlqdu692ujtrqsue8yarpm648v"
                }])
            },
            getCommitmentsByAddress: {
                all: jest.fn().mockReturnValue([
                    { campaign_id: 1 }
                ])
            },
            addUser: {
                run: jest.fn().mockReturnValue({
                    lastInsertRowid: 1
                })
            },
            addContributionToCampaign: {
                run: jest.fn().mockReturnValue({
                    lastInsertRowid: 1
                })
            },
            linkCommitmentToContribution: {
                run: jest.fn()
            },
            getContribution: {
                get: jest.fn().mockReturnValue(expectedContribution)
            },
            getCampaignCommittedSatoshis: {
                get: jest.fn().mockReturnValue({
                    committed_satoshis: 1079
                })
            },
            countCommitmentsByCampaign: {
                get: jest.fn().mockReturnValue({
                    commitment_count: 0
                })
            },
            listContributionsByCampaign: {
                all: jest.fn().mockReturnValue([
                    {
                        previous_transaction_hash: "83823488d07dfc45beb2875b93899e6018015bc003e406f74574ef4e29a69995",
                        previous_transaction_index: 0,
                        unlock_script: "473044022064c14c50a46d51869f365314af81dec3ade150151d6914768cf7984fcc30fda50220540b3f382fdc48fa0b00e755d288c521095e1396556d33f1a832c86fd38cf2ff41210279b0778b18e574ced3cfd62e31c9516ee89bb89a7510fc7eba056cc7a766757f",
                        sequenceNumber: "",
                        satoshis: 1079
                    }
                ])
            },
            addCampaignFullfillment: {
                run: jest.fn()
            }
        }
        
        app.sse = {
            event: jest.fn()
        }

        app.config = {
            auth: {
                type: "pending-contributions",
                //Make sure we have a valid auth campaign
                validAuthCampaigns: [1],
            },
            bch: {
                targetFeeRate: 1
            }
        }

        const mockUnlock = jest.fn()
        app.checkForTransactionUpdatesLock = {
            acquire: jest.fn().mockResolvedValue(mockUnlock)
        }

        const mockAssuranceContract = {
            remainingCommitmentValue: 0,
            assembleTransaction: jest.fn().mockReturnValue(Buffer.from("test", "utf-8")),
            addOutput: jest.fn(),
            addCommitment: jest.fn(),
            totalContractOutputValue: 1000
        }

        const { Contract } = require('../../src/assurance')
        
        Contract.mockImplementation(() => mockAssuranceContract)

        app.electrum = {
            request: jest.fn().mockResolvedValue("result")
        }

        const req = request(app)
        const response = await req.post('/submit/1').send({
            data: {
                inputs: [],
                amount: 0
            }
        })
        
        expect(response.status).toBe(200)
        expect(app.queries.addUser.run).toBeCalledTimes(1)
        expect(app.queries.linkCommitmentToContribution.run).toBeCalledTimes(0)
        expect(app.sse.event).toHaveBeenNthCalledWith(1, "1", "contribution", expectedContribution)
        expect(mockAssuranceContract.assembleTransaction).toBeCalled()
        expect(app.electrum.request).toBeCalledWith("blockchain.transaction.broadcast", Buffer.from("test", "utf-8").toString("hex"))
        expect(app.queries.addCampaignFullfillment.run).toBeCalledWith(expect.objectContaining({
            fullfillment_transaction: "result"
        }))
        expect(app.sse.event).toHaveBeenNthCalledWith(2, "1", "fullfillment", expect.objectContaining({
            fullfillment_transaction: "result"
        }))        
    })

    test("it calls completes the campaign if amount contributed equals requested", async () => {
        const app = express()
        
        app.debug = {
            server: jest.fn(),
            object: jest.fn(),
            action: jest.fn(),
            struct: jest.fn()
        }

        const expectedContribution = {
            user_id: 1,
            campaign_id: 1,
            contribution_comment: "",
            contribution_timestamp: moment().unix()
        }

        app.queries = {
            getCampaign: {
                get: jest.fn().mockReturnValue({
                    starts: moment().subtract(1, 'days').unix(),
                    expires: moment().add(2, 'days').unix(),
                })
            },
            listRecipientsByCampaign: {
                all: jest.fn().mockReturnValue([{
                    recipient_satoshis: 1000,
                    user_address: "bchtest:qq2ckhgcz4fvna8jvlqdu692ujtrqsue8yarpm648v"
                }])
            },
            getCommitmentsByAddress: {
                all: jest.fn().mockReturnValue([
                    { campaign_id: 1 }
                ])
            },
            addUser: {
                run: jest.fn().mockReturnValue({
                    lastInsertRowid: 1
                })
            },
            addContributionToCampaign: {
                run: jest.fn().mockReturnValue({
                    lastInsertRowid: 1
                })
            },
            linkCommitmentToContribution: {
                run: jest.fn()
            },
            getContribution: {
                get: jest.fn().mockReturnValue(expectedContribution)
            },
            getCampaignCommittedSatoshis: {
                get: jest.fn().mockReturnValue({
                    committed_satoshis: 1079
                })
            },
            countCommitmentsByCampaign: {
                get: jest.fn().mockReturnValue({
                    commitment_count: 0
                })
            },
            listContributionsByCampaign: {
                all: jest.fn().mockReturnValue([
                    {
                        previous_transaction_hash: "83823488d07dfc45beb2875b93899e6018015bc003e406f74574ef4e29a69995",
                        previous_transaction_index: 0,
                        unlock_script: "473044022064c14c50a46d51869f365314af81dec3ade150151d6914768cf7984fcc30fda50220540b3f382fdc48fa0b00e755d288c521095e1396556d33f1a832c86fd38cf2ff41210279b0778b18e574ced3cfd62e31c9516ee89bb89a7510fc7eba056cc7a766757f",
                        sequenceNumber: "",
                        satoshis: 1079
                    }
                ])
            },
            addCampaignFullfillment: {
                run: jest.fn()
            },

            addCommitment: {
                run: jest.fn().mockReturnValue({
                    lastInsertRowid: 1
                })
            }
        }
        
        app.sse = {
            event: jest.fn()
        }

        app.config = {
            auth: {
                type: "pending-contributions",
                //Make sure we have a valid auth campaign
                validAuthCampaigns: [1],
            },
            bch: {
                targetFeeRate: 1,
                network: "testnet"
            }
        }

        const mockUnlock = jest.fn()
        app.checkForTransactionUpdatesLock = {
            acquire: jest.fn().mockResolvedValue(mockUnlock)
        }

        app.electrum = {
            request: jest.fn().mockImplementation((method, ...payload) => {

                if (method === "blockchain.transaction.get") {
                    
                    return {
                        vout: [
                            { value_satoshi: 1079, scriptPubKey: "hex" },
                            // { value: 1079, scriptPubKey: "hex" },
                            // { value: 0.00001079, scriptPubKey: { hex: "hex" } }
                        ]
                    }
                }
                
                if (method === "blockchain.scripthash.listunspent") {
                    
                    return [
                        { tx_hash: "previous_output_transaction_hash", tx_pos: "0", value: 0 }
                    ]
                }

                if (method === "blockchain.transaction.broadcast") {
                    return payload[0]
                }
            }),
            subscribe: jest.fn()
        }
        
        const { Contract } = require('../../src/assurance')
        
        Contract.parseKeyHashUnlockScript = jest.fn().mockReturnValue({
            publicKey: "",
            signature: { signature: "" }
        })

        const mockVerificationMessage = {}

        const mockAssuranceContract = {
            remainingCommitmentValue: 0,
            assembleTransaction: jest.fn().mockReturnValue(Buffer.from("test", "utf-8")),
            addOutput: jest.fn(),
            addCommitment: jest.fn(),
            totalContractOutputValue: 1000,
            assembleSighashDigest: jest.fn().mockReturnValue(mockVerificationMessage)
        }

        Contract.mockImplementation(() => mockAssuranceContract)
        
        app.subscribedScriphashes = []

        app.use(urlencoded({ extended: true }));
        app.use(json());
        
        app.use("/submit", router)

        const req = request(app)
        const response = await req.post('/submit/1').send({
            inputs: [
                {
                    previous_output_transaction_hash: "previous_output_transaction_hash",
                    previous_output_index: "0",
                    unlocking_script: ""
                }
            ],
            data: {
                amount: 1079
            }
        })
        
        expect(response.status).toBe(200)
        expect(app.queries.addUser.run).toBeCalledTimes(1)
        expect(app.queries.linkCommitmentToContribution.run).toBeCalledTimes(1)
        expect(app.sse.event).toHaveBeenNthCalledWith(1, "1", "contribution", expectedContribution)
        expect(mockAssuranceContract.assembleTransaction).toBeCalled()
        expect(app.electrum.request).toBeCalledWith("blockchain.transaction.broadcast", Buffer.from("test", "utf-8").toString("hex"))
        expect(app.queries.addCampaignFullfillment.run).toBeCalledWith(expect.objectContaining({
            fullfillment_transaction: Buffer.from("test", "utf-8").toString("hex")
        }))
        expect(app.sse.event).toHaveBeenNthCalledWith(2, "1", "fullfillment", expect.objectContaining({
            fullfillment_transaction: Buffer.from("test", "utf-8").toString("hex")
        }))        
    })
})