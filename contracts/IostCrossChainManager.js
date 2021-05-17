
const POLYCHAIN_PUBKEY_LEN = 67;
const POLYCHAIN_SIGNATURE_LEN = 65;

const INIT_STATUS_KEY = "INIT_STATUS";

class IostCrossChainManager {
  init () {}

  can_update (data) {
    return blockchain.requireAuth(blockchain.contractOwner(), 'active');
  }

  // can be call for everyone ?
  // rawHeader: byte[]
  // pubkeyList: byte[]
  // can be use hex str, Buffer.form()
  initGenesisBlock(rawHeader, pubKeyList) {
    this._checkKey(INIT_STATUS_KEY, false, "has been init");
    const header = this._deserializerHeader(rawHeader);
    const bookKeeper = this._verifyPubKey(pubKeyList);
    if (header.nextBookKeeper !== bookKeeper.nextBookKeeper) {
      throw "nextBookers illegal"
    }
    this._setCurrentEpochHeight(header.height);
    this._put(INIT_STATUS_KEY, 1);

    blockchain.event(JSON.stringify({height: header.height, rawHeader}))
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

  // source: byte[]
  _deserializerHeader (source) {
    let offset = 0;
    const version = new Int64(source.slice(offset, 4));
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

  _setCurrentEpochHeight(height) {
    this._put("currentEpochHeight", height)
  }

  _getBookKeeper(keyLen, minSigNum, pubkeyList) {
    let buff = new Uint16Array(keyLen);
    const keepers = new Array(20);
    for (let i = 0; i < keyLen; i++) {
      buff = pubkeyList.slice(i * POLYCHAIN_PUBKEY_LEN, POLYCHAIN_PUBKEY_LEN);
      keepers[i] = pubkeyList.slice(i * POLYCHAIN_PUBKEY_LEN, POLYCHAIN_PUBKEY_LEN).slice(3, 64);
    }
  }

  _writeVarBytes(source, target) {
    return _writeVarInt(target.length, source).concat(target)
  }

  _writeVarInt(value, source) {
    if (value < 0) {
      return  source;
    }else if (value < 0xFD) {
      var v = value.to
    } else if (value <=0xFFFF) {

    } else if (value <= 0XFFFFFFFF) {

    } else {

    }
  }

  // key,value string
  _put(key, value){
    storage.put(key, value, tx.publisher)
  }
}

module.exports = IostCrossChainManager;