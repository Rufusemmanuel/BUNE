export {
  BUILDER_CODE as builderCode,
  BUILDER_DATA_SUFFIX as dataSuffix,
  appendBuilderDataSuffix as appendBuilderCodeSuffix,
} from './builderAttribution'

import { BUILDER_DATA_SUFFIX } from './builderAttribution'

export const sendCallsCapabilities = { dataSuffix: BUILDER_DATA_SUFFIX }
