# @openparser/adapters

Convert provider OCR responses into `openparser@1` documents.

[Documentation](https://docs.openparser.dev) · [OpenParser](https://openparser.dev)

## Install

```bash
npm install @openparser/adapters
```

## Paddle HPS

```ts
import {
  OCR_PARSE_CONVERTER_VERSION,
  mapLayoutResultsToParsedDocument,
} from '@openparser/adapters/paddle';
```

Pass the `layoutParsingResults` returned by HPS. You can also provide page
dimensions and a map of figure URLs.

Your application calls the provider and stores extracted figures. Pass the
response to the adapter for conversion.

## License

[Apache-2.0](./LICENSE)
