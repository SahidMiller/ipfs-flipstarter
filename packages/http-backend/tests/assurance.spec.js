const { expect, test, describe } = require('@jest/globals')
const { TextDecoder, TextEncoder } = require('util');

const moment = require('moment')

global.TextDecoder = TextDecoder
global.TextEncoder = TextEncoder

const assuranceContract = require("../src/assurance").Contract
const { BITBOX } = require('bitbox-sdk')

describe("assurance", () => {

    test("adds recipients as outputs and commitments as inputs", () => {
        const contract = new assuranceContract()

        contract.addOutput(1000, "bchtest:qqekcwxmfzhgn775r6t382g08mx4cxclfsd2d2v0x0")
        
        expect(() => contract.addOutput(1000, "bchtest:invalidaddress")).toThrow()
        expect(() => contract.addOutput(NaN, "bchtest:qqekcwxmfzhgn775r6t382g08mx4cxclfsd2d2v0x0")).toThrow()
        expect(() => contract.addOutput(0.001, "bchtest:qqekcwxmfzhgn775r6t382g08mx4cxclfsd2d2v0x0")).toThrow()
        expect(() => contract.addOutput(-50, "bchtest:qqekcwxmfzhgn775r6t382g08mx4cxclfsd2d2v0x0")).toThrow()
        expect(() => contract.addOutput(0, "bchtest:qqekcwxmfzhgn775r6t382g08mx4cxclfsd2d2v0x0")).toThrow()
        expect(() => contract.addOutput(2099999997690000 + 1, "bchtest:qqekcwxmfzhgn775r6t382g08mx4cxclfsd2d2v0x0")).toThrow()

        const commitmentObject = {
            previousTransactionHash: Buffer.from("82af321d46ea9075f041ce3c0f8f6125193177c19712bb6cc6a704fb7c250361", "hex"),
            previousTransactionOutputIndex: 0,
            unlockScript: Buffer.from("", "hex"),
            sequenceNumber: 0xffffffff,
            value: 1000
        };
        
        contract.addCommitment(commitmentObject);
        

        expect(contract.countContractOutputs).toEqual(1)
        expect(contract.inputs.length).toEqual(1)
        expect(contract.totalContractOutputValue).toEqual(1000)
        expect(contract.totalCommitmentValue).toEqual(1000)
        expect(contract.remainingCommitmentValue).toEqual(0)
    })

    test("output value encoding", () => {

        //expect(assuranceContract.encodeOutputValue(1000)).toBe()
        assuranceContract.encodeOutputValue(1000)

        expect(() => assuranceContract.encodeOutputValue(NaN)).toThrow()
        expect(() => assuranceContract.encodeOutputValue(0.001)).toThrow()
        expect(() => assuranceContract.encodeOutputValue(-50)).toThrow()
        expect(() => assuranceContract.encodeOutputValue(Number.MAX_VALUE)).toThrow()    
    })

    test("assembles a sighash", () => {
        const contract = new assuranceContract()

        let firstCall = true
        const originalBitbox = contract.bitbox
        contract.bitbox = {
            Crypto: {
                hash256: jest.fn().mockImplementation((payload) => {
                    if (firstCall) {
                        firstCall = false
                        return Buffer.from("outputHash", "utf8")
                    }
    
                    return Buffer.from("sighash", "utf8")
                })
            },
            Address: originalBitbox.Address 
        }

        contract.addOutput(1000, "bchtest:qqekcwxmfzhgn775r6t382g08mx4cxclfsd2d2v0x0")

        const commitmentObject = {
            previousTransactionHash: Buffer.from("82af321d46ea9075f041ce3c0f8f6125193177c19712bb6cc6a704fb7c250361", "hex"),
            previousTransactionOutputIndex: 0,
            unlockScript: Buffer.from("unlocking script", "hex"),
            sequenceNumber: 0xffffffff,
            value: 1000
        };

        const outputIndexBuffer = assuranceContract.encodeOutputIndex(commitmentObject.previousTransactionOutputIndex)
        const outputValueBuffer = assuranceContract.encodeOutputValue(commitmentObject.value)

        const hash = contract.assembleSighashDigest(commitmentObject.previousTransactionHash, outputIndexBuffer, outputValueBuffer, commitmentObject.unlockScript);
        // const { value, locking_script } = contract.outputs[0]
        // const outputs = Buffer.concat([value, varBuf(locking_script)])

        expect(hash).toEqual(Buffer.from("sighash", "utf8"))
        expect(contract.bitbox.Crypto.hash256).toBeCalledWith(Buffer.concat([
            Buffer.from("02000000", "hex"),
            Buffer.from("0000000000000000000000000000000000000000000000000000000000000000", "hex"),
            Buffer.from("0000000000000000000000000000000000000000000000000000000000000000", "hex"),
            Buffer.concat([reverseBuf(commitmentObject.previousTransactionHash), outputIndexBuffer]),
            Buffer.concat([Buffer.from("19", "hex"), commitmentObject.unlockScript]),
            outputValueBuffer,
            Buffer.from("FFFFFFFF", "hex"),
            Buffer.from("outputHash", "utf8"),
            Buffer.from("00000000", "hex"),
            Buffer.from("c1000000", "hex")
        ]))
    })

    test("assembles full transaction", () => {
        const contract = new assuranceContract()

        let firstCall = true
        const originalBitbox = contract.bitbox
        contract.bitbox = {
            Crypto: {
                hash256: jest.fn().mockImplementation((payload) => {
                    if (firstCall) {
                        firstCall = false
                        return Buffer.from("outputHash", "utf8")
                    }
    
                    return Buffer.from("sighash", "utf8")
                })
            },
            Address: originalBitbox.Address 
        }

        contract.addOutput(1000, "bchtest:qqekcwxmfzhgn775r6t382g08mx4cxclfsd2d2v0x0")

        const commitmentObject = {
            previousTransactionHash: Buffer.from("82af321d46ea9075f041ce3c0f8f6125193177c19712bb6cc6a704fb7c250361", "hex"),
            previousTransactionOutputIndex: 0,
            unlockScript: Buffer.from("unlocking script", "hex"),
            sequenceNumber: 0xffffffff,
            value: 1000
        };
        
        contract.addCommitment(commitmentObject);

        const result = contract.assembleTransaction()

        expect(result).toEqual(Buffer.concat([
            Buffer.from("02000000", "hex"),
            varInt(contract.inputs.length),
            contract.serializeCommitments(),
            varInt(contract.outputs.length),
            contract.serializeOutputs(),
            Buffer.from("00000000", "hex")
        ]))
    })

    test("parses unlock script", () => {
        
        const unlockScript = {
            slice: jest.fn().mockImplementation((start, end) => {
                if (start === 1) {
                    return "signature"
                }

                if (start === -33) {
                    return "public key"
                }
            })
        }

        let { publicKey, signature } = assuranceContract.parseKeyHashUnlockScript(unlockScript)
        
        expect(publicKey).toEqual("public key")
        expect(signature).toEqual("signature")
    })
})

function reverseBuf(source) {
    // Allocate space for the reversed buffer.
    let reversed = Buffer.allocUnsafe(source.length);

    // Iterate over half of the buffers length, rounded up..
    for (
      let lowIndex = 0, highIndex = source.length - 1;
      lowIndex <= highIndex;
      lowIndex += 1, highIndex -= 1
    ) {
      // .. and swap each position from the beggining to the end.
      reversed[lowIndex] = source[highIndex];
      reversed[highIndex] = source[lowIndex];
    }

    // Return the reversed buffer.
    return reversed;
}

function varBuf(input) {
    let prependLength = varInt(input.length);
    let result = Buffer.concat([prependLength, input]);

    // Return the variable buffer encoded data.
    return result;
}

function varInt(number) {
    // Declare storage for the results.
    let result;

    // If the number should be encoded in 1 byte..
    if (number < 0xfd) {
      result = Buffer.alloc(1);
      result.writeUInt8(number);
    }
    // If the number should be encoded in 3 bytes..
    else if (number < 0xffff) {
      result = Buffer.alloc(3);
      result.writeUInt8(0xfd);
      result.writeUInt16LE(number, 1);
    }
    // If the number should be encoded in 5 bytes..
    else if (number < 0xffffffff) {
      result = Buffer.alloc(5);
      result.writeUInt8(0xfe);
      result.writeUInt32LE(number, 1);
    }
    // If the number should be encoded in 9 bytes..
    else {
      result = Buffer.alloc(9);
      result.writeUInt8(0xff);
      result.writeBigUInt64LE(BigInt(number), 1);
    }

    // Return the variable integer buffer.
    return result;
}
