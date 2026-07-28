from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.chunk_provenance_span import ChunkProvenanceSpan





T = TypeVar("T", bound="ExtractionChunk")



@_attrs_define
class ExtractionChunk:
    """ Canonical extraction chunk. `id` and `content_sha256` are lowercase SHA-256 hashes;
    `content_sha256` hashes `text`. Page numbers are sorted and unique. When present,
    `page_start` and `page_end` equal the minimum and maximum `page_numbers`. Region IDs and
    provenance spans must match the parent document's regions.

        Attributes:
            id (str):
            index (int):
            document_id (str):
            text (str):
            content_sha256 (str):
            page_numbers (list[int]):
            region_ids (list[str]):
            provenance_spans (list[ChunkProvenanceSpan]):
            page_start (int | None | Unset):
            page_end (int | None | Unset):
     """

    id: str
    index: int
    document_id: str
    text: str
    content_sha256: str
    page_numbers: list[int]
    region_ids: list[str]
    provenance_spans: list[ChunkProvenanceSpan]
    page_start: int | None | Unset = UNSET
    page_end: int | None | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.chunk_provenance_span import ChunkProvenanceSpan
        id = self.id

        index = self.index

        document_id = self.document_id

        text = self.text

        content_sha256 = self.content_sha256

        page_numbers = self.page_numbers



        region_ids = self.region_ids



        provenance_spans = []
        for provenance_spans_item_data in self.provenance_spans:
            provenance_spans_item = provenance_spans_item_data.to_dict()
            provenance_spans.append(provenance_spans_item)



        page_start: int | None | Unset
        if isinstance(self.page_start, Unset):
            page_start = UNSET
        else:
            page_start = self.page_start

        page_end: int | None | Unset
        if isinstance(self.page_end, Unset):
            page_end = UNSET
        else:
            page_end = self.page_end


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "id": id,
            "index": index,
            "document_id": document_id,
            "text": text,
            "content_sha256": content_sha256,
            "page_numbers": page_numbers,
            "region_ids": region_ids,
            "provenance_spans": provenance_spans,
        })
        if page_start is not UNSET:
            field_dict["page_start"] = page_start
        if page_end is not UNSET:
            field_dict["page_end"] = page_end

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.chunk_provenance_span import ChunkProvenanceSpan
        d = dict(src_dict)
        id = d.pop("id")

        index = d.pop("index")

        document_id = d.pop("document_id")

        text = d.pop("text")

        content_sha256 = d.pop("content_sha256")

        page_numbers = cast(list[int], d.pop("page_numbers"))


        region_ids = cast(list[str], d.pop("region_ids"))


        provenance_spans = []
        _provenance_spans = d.pop("provenance_spans")
        for provenance_spans_item_data in (_provenance_spans):
            provenance_spans_item = ChunkProvenanceSpan.from_dict(provenance_spans_item_data)



            provenance_spans.append(provenance_spans_item)


        def _parse_page_start(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        page_start = _parse_page_start(d.pop("page_start", UNSET))


        def _parse_page_end(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        page_end = _parse_page_end(d.pop("page_end", UNSET))


        extraction_chunk = cls(
            id=id,
            index=index,
            document_id=document_id,
            text=text,
            content_sha256=content_sha256,
            page_numbers=page_numbers,
            region_ids=region_ids,
            provenance_spans=provenance_spans,
            page_start=page_start,
            page_end=page_end,
        )

        return extraction_chunk
