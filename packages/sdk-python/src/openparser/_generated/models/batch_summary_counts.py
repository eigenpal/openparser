from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset







T = TypeVar("T", bound="BatchSummaryCounts")



@_attrs_define
class BatchSummaryCounts:
    """
        Attributes:
            total (int):
            queued (int):
            running (int):
            succeeded (int):
            failed (int):
            indeterminate (int):
     """

    total: int
    queued: int
    running: int
    succeeded: int
    failed: int
    indeterminate: int





    def to_dict(self) -> dict[str, Any]:
        total = self.total

        queued = self.queued

        running = self.running

        succeeded = self.succeeded

        failed = self.failed

        indeterminate = self.indeterminate


        field_dict: dict[str, Any] = {}

        field_dict.update({
            "total": total,
            "queued": queued,
            "running": running,
            "succeeded": succeeded,
            "failed": failed,
            "indeterminate": indeterminate,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        total = d.pop("total")

        queued = d.pop("queued")

        running = d.pop("running")

        succeeded = d.pop("succeeded")

        failed = d.pop("failed")

        indeterminate = d.pop("indeterminate")

        batch_summary_counts = cls(
            total=total,
            queued=queued,
            running=running,
            succeeded=succeeded,
            failed=failed,
            indeterminate=indeterminate,
        )

        return batch_summary_counts
