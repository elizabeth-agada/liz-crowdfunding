import { describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing';
import * as algokit from '@algorandfoundation/algokit-utils';
import algosdk, { makePaymentTxnWithSuggestedParamsFromObject } from 'algosdk';
import { HelloUserClient } from '../contracts/clients/HelloUserClient';

const fixture = algorandFixture();
algokit.Config.configure({ populateAppCallResources: true });

let appClient: HelloUserClient;

describe('HelloUser', () => {
  beforeEach(fixture.beforeEach);
  let algod: algosdk.Algodv2;
  let creator: algosdk.Account;
  let beneficiary: algosdk.Account;
  let firstFunder: algosdk.Account;
  let secondFunder: algosdk.Account;
  let smartContractAddress: string;

  beforeAll(async () => {
    await fixture.beforeEach();
    const { testAccount, algod: algodServer, kmd } = fixture.context;
    algod = algodServer;
    creator = testAccount;
    const { algorand } = fixture;

    beneficiary = await algokit.getOrCreateKmdWalletAccount(
      {
        name: 'beneficiary',
        fundWith: algokit.algos(0),
      },
      algod,
      kmd
    );

    firstFunder = await algokit.getOrCreateKmdWalletAccount(
      {
        name: 'firstFunder',
        fundWith: algokit.algos(2000),
      },
      algod,
      kmd
    );

    secondFunder = await algokit.getOrCreateKmdWalletAccount(
      {
        name: 'secondFunder',
        fundWith: algokit.algos(100),
      },
      algod,
      kmd
    );

    appClient = new HelloUserClient(
      {
        sender: testAccount,
        resolveBy: 'id',
        id: 0,
      },
      algorand.client.algod
    );

    const response = await appClient.create.createApplication({
      targetAmount: BigInt(10),
      beneficiary: beneficiary.addr,
    });
    smartContractAddress = response.appAddress;
  });


  test('viewTargetAmount', async () => {
    const response = await appClient.viewTargetAmount({});
    expect(response.return?.valueOf()).toBe(BigInt(10));
  });

  test('viewCurrentAmount', async () => {
    const response = await appClient.viewCurrentAmount({});
    expect(response.return?.valueOf()).toBe(BigInt(50));
  });

  test('viewBeneficiary', async () => {
    const response = await appClient.viewBeneficiary({});
    expect(response.return?.valueOf()).toBe(beneficiary.addr));
  });

  test('payIntoCrowdFund, async () => {
    await appClient.appClient.fundAppAccount({ amount: algokit.microAlgos(200_000) });
    const suggestedParams = await algokit.getTransactionParams(undefined, algod);
    const SendTransaction = makePaymentTxnWithSuggestedParamsFromObject({
      from: firstFunder.addr,
      to: smartContractAddress,
      amount: 5,
      suggestedParams,
    });

    await appClient.payIntoCrowdFund(
      {
        paymentTxn: {
          transaction: SendTransaction,
          signer: firstFunder,
        },
      },
      {
        sender: firstFunder,
      }
      );

      const response = await appClient.viewCurrentAmount({});
      expect(response.return?.valueOf()).toBe(BigInt(5));
    });

    test('check smart contract balance (before)', async () => {
      const beneficiaryAccountInformation = await Algod.accountInformation(smartContractAddress).do();
      const beneficiaryBalance = beneficiayrAccountInformation.amount;

      expect(beneficiaryBalance).toBeGreaterThanOrEqual(5);
    });

    test('payIntoCrowdFund (second funder)', async () => {
      const suggestedParams = await algokit.acc(undefined, algod);
      const SendTransaction = makePaymentTxnWithSuggestedParamsFromObject({
        from: secondFunder.addr,
        to: smartContractAddress,
        amount: 5,
        suggestedParams,
      });

      await appClient.payIntoCrowdFund(
        {
          paymentTxn: {
            transaction: SendTransaction,
            signer: secondFunder,
          },
        },
        {
          sender: secondFunder,
        }
      );

      const response = await appClient.viewCurrentAmount({});
      expect(response.return?.valueOf()).toBe(BigInt(10));
    }
});
