(() => {
  const BUILDER_CODE = "bc_prv2f8tm";
  const BUILDER_MAGIC = "80218021802180218021802180218021";

  function encodeBuilderDataSuffix(code) {
    const bytes = new TextEncoder().encode(code.trim());
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    const len = bytes.length.toString(16).padStart(2, "0");
    return `0x${hex}${len}00${BUILDER_MAGIC}`;
  }

  const BUILDER_DATA_SUFFIX = encodeBuilderDataSuffix(BUILDER_CODE);

  function hasBuilderDataSuffix(data) {
    return Boolean(data && data.toLowerCase().endsWith(BUILDER_DATA_SUFFIX.slice(2).toLowerCase()));
  }

  function appendBuilderDataSuffix(data) {
    const base = data && data !== "0x" ? data : "0x";
    if (hasBuilderDataSuffix(base)) return base;
    return `${base}${BUILDER_DATA_SUFFIX.slice(2)}`;
  }

  function assertBuilderAttributed(data) {
    if (!hasBuilderDataSuffix(data)) {
      throw new Error("Blocked unattributed transaction: missing Base Builder Code suffix");
    }
  }

  async function supportsBuilderDataSuffix(provider) {
    try {
      if (!provider?.request) return false;
      const capabilities = await provider.request({ method: "wallet_getCapabilities", params: [] });
      const serialized = JSON.stringify(capabilities).toLowerCase();
      return serialized.includes("datasuffix") || serialized.includes("data_suffix");
    } catch {
      return false;
    }
  }

  async function sendTransactionWithBuilderCode(signer, tx) {
    const data = appendBuilderDataSuffix(tx.data || "0x");
    assertBuilderAttributed(data);
    return signer.sendTransaction({ ...tx, data });
  }

  async function writeContractWithBuilderCode(contract, functionName, args = []) {
    const tx = await contract[functionName].populateTransaction(...args);
    return sendTransactionWithBuilderCode(contract.runner, tx);
  }

  function enforceSignerBuilderAttribution(signer) {
    if (!signer || signer.__builderAttributionPatched) return signer;
    const originalSendTransaction = signer.sendTransaction.bind(signer);
    signer.sendTransaction = (tx) => {
      const data = appendBuilderDataSuffix(tx?.data || "0x");
      assertBuilderAttributed(data);
      return originalSendTransaction({ ...tx, data });
    };
    signer.__builderAttributionPatched = true;
    return signer;
  }

  window.BUNE_BUILDER_ATTRIBUTION = {
    BUILDER_CODE,
    BUILDER_DATA_SUFFIX,
    encodeBuilderDataSuffix,
    hasBuilderDataSuffix,
    appendBuilderDataSuffix,
    assertBuilderAttributed,
    supportsBuilderDataSuffix,
    sendTransactionWithBuilderCode,
    writeContractWithBuilderCode,
    enforceSignerBuilderAttribution,
  };
})();
