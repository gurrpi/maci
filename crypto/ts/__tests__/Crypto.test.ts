import {
    genPubKey,
    genKeypair,
    genEcdhSharedKey,
    encrypt,
    decrypt,
    sign,
    sha256Hash,
    hash5,
    hash11,
    hash12,
    verifySignature,
} from '../'


const SNARK_FIELD_SIZE = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617')

describe('Cryptographic operations', () => {
    const { privKey, pubKey } = genKeypair()
    const k = genKeypair()

    const privKey1 = k.privKey
    const pubKey1 = k.pubKey

    const ecdhSharedKey = genEcdhSharedKey(privKey, pubKey1)
    const ecdhSharedKey1 = genEcdhSharedKey(privKey1, pubKey)

    const plaintext: any[] = []
    for (let i = 0; i < 5; i++) {
        plaintext.push(BigInt(Math.floor(Math.random() * 50)))
    }

    const ciphertext = encrypt(plaintext, ecdhSharedKey)
    const decryptedCiphertext = decrypt(ciphertext, ecdhSharedKey)

    describe('Hashing', () => {
        it('The hash of a plaintext should be smaller than the snark field size', () => {
            const h = hash5(plaintext)
            expect(h < SNARK_FIELD_SIZE).toBeTruthy()

            const s = sha256Hash(plaintext)
            expect(s < SNARK_FIELD_SIZE).toBeTruthy()
        })
    })

    describe('sha256Hash([0, 1])', () => {
        const s = sha256Hash([BigInt(0), BigInt(1)])
        expect(s.toString()).toEqual(
            '21788914573420223731318033363701224062123674814818143146813863227479480390499'
        )
    })

    describe('Hash12', () => {
        it('Hashing a smaller array should work', () => {
            const h = hash12([BigInt(1), BigInt(2), BigInt(3)])
            expect(h < SNARK_FIELD_SIZE).toBeTruthy()
        })

        it('Hashing more than 12 elements should throw', () => {
            const arrayOf12: any[] = []
            for (let i = 0; i < 13; i++) {
                arrayOf12.push(BigInt(i))
            }

            expect(() => hash12(arrayOf12)).toThrow(TypeError)
        })
    })

    describe('Hash11', () => {
        it('Hashing a smaller array should work', () => {
            const h = hash11([BigInt(1), BigInt(2), BigInt(3)])
            expect(h < SNARK_FIELD_SIZE).toBeTruthy()
        })

        it('Hashing more than 11 elements should throw', () => {
            const arrayOf12: any[] = []
            for (let i = 0; i < 12; i++) {
                arrayOf12.push(BigInt(i))
            }

            expect(() => hash11(arrayOf12)).toThrow(TypeError)
        })
    })

    describe('Public and private keys', () => {
        it('A private key should be smaller than the snark field size', () => {
            expect(privKey < SNARK_FIELD_SIZE).toBeTruthy()
            // TODO: add tests to ensure that the prune buffer step worked
        })

        it('A public key\'s constitutent values should be smaller than the snark field size', () => {
            // TODO: Figure out if these checks are correct and enough
            expect(pubKey[0] < SNARK_FIELD_SIZE).toBeTruthy()
            expect(pubKey[1] < SNARK_FIELD_SIZE).toBeTruthy()
        })
    })

    describe('ECDH shared key generation', () => {

        it('The shared keys should match', () => {
            expect(ecdhSharedKey.toString()).toEqual(ecdhSharedKey1.toString())
        })

        it('A shared key should be smaller than the snark field size', () => {
            // TODO: Figure out if this check is correct and enough
            expect(ecdhSharedKey < SNARK_FIELD_SIZE).toBeTruthy()
        })
    })

    describe('Encryption and decryption', () => {
        it('The ciphertext should be of the correct format', () => {
            expect(ciphertext).toHaveProperty('iv')
            expect(ciphertext).toHaveProperty('data')
            expect(ciphertext.data).toHaveLength(plaintext.length)
        })

        it('The ciphertext should differ from the plaintext', () => {
            expect.assertions(plaintext.length)
            for (let i = 0; i < plaintext.length; i++) {
                expect(plaintext[i] !== ciphertext[i + 1]).toBeTruthy()
            }
        })

        it('The ciphertext should be smaller than the snark field size', () => {
            expect(ciphertext.iv < SNARK_FIELD_SIZE).toBeTruthy()
            for (let i = 0; i < ciphertext.data.length; i++) {
                // TODO: Figure out if this check is correct and enough
                expect(ciphertext.data[i] < SNARK_FIELD_SIZE).toBeTruthy()
            }
        })

        it('The decrypted ciphertext should be correct', () => {
            expect.assertions(decryptedCiphertext.length)

            for (let i = 0; i < decryptedCiphertext.length; i++) {
                expect(decryptedCiphertext[i]).toEqual(plaintext[i])
            }
        })

        it('The plaintext should be incorrect if decrypted with a different key', () => {
            const sk = BigInt(1)
            const pk = genPubKey(sk)
            const differentKey = genEcdhSharedKey(sk, pk)

            const invalidPlaintext = decrypt(ciphertext, differentKey)

            expect.assertions(invalidPlaintext.length)

            for (let i = 0; i < decryptedCiphertext.length; i++) {
                expect(invalidPlaintext[i] === plaintext[i]).toBeFalsy()
            }
        })
    })

    describe('Signature generation and verification', () => {
        const message = BigInt(Math.floor(Math.random() * 1000000000))
        const signature = sign(privKey, message)

        it('The signature should have the correct format and it constitutent parts should be smaller than the snark field size', () => {
            expect(signature).toHaveProperty('R8')
            expect(signature).toHaveProperty('S')
            expect(signature.R8[0] < SNARK_FIELD_SIZE).toBeTruthy()
            expect(signature.R8[1] < SNARK_FIELD_SIZE).toBeTruthy()
            expect(signature.S < SNARK_FIELD_SIZE).toBeTruthy()
        })

        it('The signature should be valid', () => {
            const valid = verifySignature(
                message,
                signature,
                pubKey,
            )
            expect(valid).toBeTruthy()
        })

        it('The signature should be invalid for a different message', () => {
            const valid = verifySignature(
                message + BigInt(1),
                signature,
                pubKey,
            )
            expect(valid).toBeFalsy()
        })

        it('The signature should be invalid if tampered with', () => {
            const valid = verifySignature(
                message,
                {
                    R8: signature.R8,
                    S: BigInt(1),
                },
                pubKey,
            )
            expect(valid).toBeFalsy()
        })

        it('The signature should be invalid for a different public key', () => {
            const valid = verifySignature(
                message,
                signature,
                pubKey1,
            )
            expect(valid).toBeFalsy()
        })
    })
})
