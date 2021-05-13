
const POLYCHAIN_PUBKEY_LEN = 67;
const POLYCHAIN_SIGNATURE_LEN = 65;

const INIT_STATUS_KEY = "INIT_STATUS";

class IostCrossChainManager {
  init () {}

  can_update (data) {
    return blockchain.requireAuth(blockchain.contractOwner(), 'active');
  }

  // can be call for everyone ?
  initGenesisBlock(rawHeader, pubKeyList) {
    this._checkKey(INIT_STATUS_KEY, false, "has been init");

  }

  _contractOwnerAuth() {
    if (!blockchain.requireAuth(blockchain.contractOwner(), 'active')) {
      throw 'require contractOwner error';
    }
  }

  _checkKey(key, need, err_msg) {
    const exist = storage.has(key);
    if ((need && !exist) || (!need && exist)) {
      throw err_msg;
    }
  }

  _deserializerHeader (data) {
    return {}
  }

  _verifyPubKey(pubkeyList) {
    if (pubkeyList.length % POLYCHAIN_PUBKEY_LEN !== 0) {
      throw "pubkeyList illegal";
    }
    const n = pubkeyList.length / POLYCHAIN_PUBKEY_LEN;
    if (n < 1) {
      throw "too short pubkeyList"
    }
    return this._getBookKeeper(n, n - (n -1)/3, pubkeyList)
  }

  _getBookKeeper(keyLen, minSigNum, pubkeyList) {
    let buff = new Uint16Array(keyLen);
    const keepers = new Array(20);

  }
}

module.exports = IostCrossChainManager;