from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import cast
from typing import Literal, cast

if TYPE_CHECKING:
  from ..models.extraction_chunk import ExtractionChunk
  from ..models.page_block import PageBlock
  from ..models.region import Region
  from ..models.region_content import RegionContent





T = TypeVar("T", bound="ParsedDocument")



@_attrs_define
class ParsedDocument:
    """ Versioned OpenParser `openparser@1` document representation. `blocks` is the primary
    stable interface; `regions`, `contents`, and `chunks` preserve provider-neutral geometry,
    confidence, labels, provenance, and extraction views. Compatible optional fields may be
    added within version 1; breaking representation changes create a new output-format version.

        Attributes:
            output_format (Literal['openparser@1']):
            document_id (str):
            page_count (int): Authoritative successfully parsed page count from the HPS/parse result. Customer
                page billing uses this value only when a successful terminal result is published.
            markdown (str): Derived markdown rendered from ordered blocks.
            blocks (list[PageBlock]):
            regions (list[Region]):
            contents (list[RegionContent]):
            chunks (list[ExtractionChunk]):
     """

    output_format: Literal['openparser@1']
    document_id: str
    page_count: int
    markdown: str
    blocks: list[PageBlock]
    regions: list[Region]
    contents: list[RegionContent]
    chunks: list[ExtractionChunk]





    def to_dict(self) -> dict[str, Any]:
        from ..models.extraction_chunk import ExtractionChunk
        from ..models.page_block import PageBlock
        from ..models.region import Region
        from ..models.region_content import RegionContent
        output_format = self.output_format

        document_id = self.document_id

        page_count = self.page_count

        markdown = self.markdown

        blocks = []
        for blocks_item_data in self.blocks:
            blocks_item = blocks_item_data.to_dict()
            blocks.append(blocks_item)



        regions = []
        for regions_item_data in self.regions:
            regions_item = regions_item_data.to_dict()
            regions.append(regions_item)



        contents = []
        for contents_item_data in self.contents:
            contents_item = contents_item_data.to_dict()
            contents.append(contents_item)



        chunks = []
        for chunks_item_data in self.chunks:
            chunks_item = chunks_item_data.to_dict()
            chunks.append(chunks_item)




        field_dict: dict[str, Any] = {}

        field_dict.update({
            "output_format": output_format,
            "document_id": document_id,
            "page_count": page_count,
            "markdown": markdown,
            "blocks": blocks,
            "regions": regions,
            "contents": contents,
            "chunks": chunks,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.extraction_chunk import ExtractionChunk
        from ..models.page_block import PageBlock
        from ..models.region import Region
        from ..models.region_content import RegionContent
        d = dict(src_dict)
        output_format = cast(Literal['openparser@1'] , d.pop("output_format"))
        if output_format != 'openparser@1':
            raise ValueError(f"output_format must match const 'openparser@1', got '{output_format}'")

        document_id = d.pop("document_id")

        page_count = d.pop("page_count")

        markdown = d.pop("markdown")

        blocks = []
        _blocks = d.pop("blocks")
        for blocks_item_data in (_blocks):
            blocks_item = PageBlock.from_dict(blocks_item_data)



            blocks.append(blocks_item)


        regions = []
        _regions = d.pop("regions")
        for regions_item_data in (_regions):
            regions_item = Region.from_dict(regions_item_data)



            regions.append(regions_item)


        contents = []
        _contents = d.pop("contents")
        for contents_item_data in (_contents):
            contents_item = RegionContent.from_dict(contents_item_data)



            contents.append(contents_item)


        chunks = []
        _chunks = d.pop("chunks")
        for chunks_item_data in (_chunks):
            chunks_item = ExtractionChunk.from_dict(chunks_item_data)



            chunks.append(chunks_item)


        parsed_document = cls(
            output_format=output_format,
            document_id=document_id,
            page_count=page_count,
            markdown=markdown,
            blocks=blocks,
            regions=regions,
            contents=contents,
            chunks=chunks,
        )

        return parsed_document
