import { Contract } from '@algorandfoundation/tealscript';

export class CrowdFund extends Contract {
  beneficiary = GlobalStateKey<Address>();

  targetAmount = GlobalStateKey<uint64>();

  currentAmount = GlobalStateKey<uint64>();

  crowdFundOngoing = GlobalStateKey<boolean>();

  createApplication(targetAmount: uint64, beneficiary: Address): void {
    this.targetAmount.value = targetAmount;
    this.beneficiary.value = beneficiary;
    this.crowdFundOngoing.value = true;
  }

  payIntoCrowdFund(paymentTxn: PayTxn): void {
    assert(this.crowdFundOngoing.value, 'The crowd fund has to be going');
    assert(paymentTxn.receiver === this.app.address, 'The receiver has to be the smart contract Address');
    assert(paymentTxn.amount > 0, 'The amount has to be greater than 0');
    assert(paymentTxn.sender === this.txn.sender, 'The sender has to be the same as the');

    this.currentAmount.value = this.currentAmount.value + paymentTxn.amount;

    if (this.currentAmount.value >= this.targetAmount.value) {
      this.crowdFundOngoing.value = false;

      sendPayment({
        amount: this.app.address.balance,
        receiver: this.beneficiary.value,
      });
    }
  }

  triggerWithdrawal(): void {
    assert(this.txn.sender === this.app.creator, 'only the contract creator can trigger the withdrawal');
    assert(this.crowdFundOngoing.value, 'The crowd fund has to be ongoing');

    this.terminateContract();
  }

  private terminateContract(): void {
    this.crowdFundOngoing.value = false;

    sendPayment({
      amount: this.app.address.balance,
      receiver: this.beneficiary.value,
    });
  }

  viewTargetAmount9(): Address {
    return this.beneficiary.value;
  }
}
