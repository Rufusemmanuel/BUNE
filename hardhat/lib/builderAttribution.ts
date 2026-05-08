import { ethers } from "ethers";

export const BUILDER_CODE = "bc_prv2f8tm";
export const BUILDER_MAGIC = "80218021802180218021802180218021";
export const BUILDER_DATA_SUFFIX = encodeBuilderDataSuffix(BUILDER_CODE);

type Hex = `0x${string}`;

export function encodeBuilderDataSuffix(code: string): Hex {
  const bytes = ethers.toUtf8Bytes(code.trim());
  const hex = ethers.hexlify(bytes).slice(2);
  const len = bytes.length.toString(16).padStart(2, "0");
  return `0x${hex}${len}00${BUILDER_MAGIC}` as Hex;
}

export function hasBuilderDataSuffix(data?: string | null): boolean {
  return Boolean(data && data.toLowerCase().endsWith(BUILDER_DATA_SUFFIX.slice(2).toLowerCase()));
}

export function appendBuilderDataSuffix(data?: string | null): Hex {
  const base = data && data !== "0x" ? data : "0x";
  if (hasBuilderDataSuffix(base)) return base as Hex;
  return `${base}${BUILDER_DATA_SUFFIX.slice(2)}` as Hex;
}

export function assertBuilderAttributed(data?: string | null): asserts data is Hex {
  if (!hasBuilderDataSuffix(data)) {
    throw new Error("Blocked unattributed transaction: missing Base Builder Code suffix");
  }
}

export async function supportsBuilderDataSuffix(): Promise<boolean> {
  return false;
}

export async function sendTransactionWithBuilderCode(
  signer: ethers.Signer,
  tx: ethers.TransactionRequest,
) {
  const data = appendBuilderDataSuffix((tx.data as string | undefined) || "0x");
  assertBuilderAttributed(data);
  return signer.sendTransaction({ ...tx, data });
}

export async function writeContractWithBuilderCode(
  contract: ethers.BaseContract,
  functionName: string,
  args: unknown[] = [],
  signer?: ethers.Signer,
) {
  const runner = signer || contract.runner;
  if (!runner || !("sendTransaction" in runner)) {
    throw new Error("Contract runner cannot send transactions");
  }
  const tx = await (contract as any)[functionName].populateTransaction(...args);
  return sendTransactionWithBuilderCode(runner as ethers.Signer, tx);
}

export async function deployContractWithBuilderCode(
  factory: ethers.ContractFactory,
  args: unknown[],
) {
  const signer = factory.runner as ethers.Signer | null;
  if (!signer) throw new Error("Contract factory has no signer");
  const tx = await factory.getDeployTransaction(...args);
  const sent = await sendTransactionWithBuilderCode(signer, tx);
  const receipt = await sent.wait();
  if (!receipt?.contractAddress) throw new Error("Deployment receipt did not include a contract address");
  return factory.attach(receipt.contractAddress);
}
