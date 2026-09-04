declare module "mammoth/mammoth.browser" {
  interface ConvertResult {
    value: string;
  }

  interface MammothBrowser {
    convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<ConvertResult>;
  }

  const mammoth: MammothBrowser;
  export default mammoth;
}