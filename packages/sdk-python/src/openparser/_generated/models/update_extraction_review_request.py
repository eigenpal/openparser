from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.update_extraction_review_request_confirmations_item import UpdateExtractionReviewRequestConfirmationsItem
  from ..models.update_extraction_review_request_retractions_item import UpdateExtractionReviewRequestRetractionsItem





T = TypeVar("T", bound="UpdateExtractionReviewRequest")



@_attrs_define
class UpdateExtractionReviewRequest:
    """ Optimistic review update. Retractions peel one current tip each, in order, then confirmations apply. A retraction
    and a confirmation that overlap are rejected. At least one confirmation or retraction is required.

        Attributes:
            expected_version (int):
            confirmations (list[UpdateExtractionReviewRequestConfirmationsItem] | Unset): Fields the caller is signing. A
                value that matches the standing field is a sign-off; a different value also corrects it.
            retractions (list[UpdateExtractionReviewRequestRetractionsItem] | Unset): JSON Pointers whose current tip the
                caller is taking back. Each entry peels one confirmation. The restored value is the one recorded on that
                confirmation.
     """

    expected_version: int
    confirmations: list[UpdateExtractionReviewRequestConfirmationsItem] | Unset = UNSET
    retractions: list[UpdateExtractionReviewRequestRetractionsItem] | Unset = UNSET





    def to_dict(self) -> dict[str, Any]:
        from ..models.update_extraction_review_request_confirmations_item import UpdateExtractionReviewRequestConfirmationsItem
        from ..models.update_extraction_review_request_retractions_item import UpdateExtractionReviewRequestRetractionsItem
        expected_version = self.expected_version

        confirmations: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.confirmations, Unset):
            confirmations = []
            for confirmations_item_data in self.confirmations:
                confirmations_item = confirmations_item_data.to_dict()
                confirmations.append(confirmations_item)



        retractions: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.retractions, Unset):
            retractions = []
            for retractions_item_data in self.retractions:
                retractions_item = retractions_item_data.to_dict()
                retractions.append(retractions_item)




        field_dict: dict[str, Any] = {}

        field_dict.update({
            "expected_version": expected_version,
        })
        if confirmations is not UNSET:
            field_dict["confirmations"] = confirmations
        if retractions is not UNSET:
            field_dict["retractions"] = retractions

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.update_extraction_review_request_confirmations_item import UpdateExtractionReviewRequestConfirmationsItem
        from ..models.update_extraction_review_request_retractions_item import UpdateExtractionReviewRequestRetractionsItem
        d = dict(src_dict)
        expected_version = d.pop("expected_version")

        _confirmations = d.pop("confirmations", UNSET)
        confirmations: list[UpdateExtractionReviewRequestConfirmationsItem] | Unset = UNSET
        if _confirmations is not UNSET:
            confirmations = []
            for confirmations_item_data in _confirmations:
                confirmations_item = UpdateExtractionReviewRequestConfirmationsItem.from_dict(confirmations_item_data)



                confirmations.append(confirmations_item)


        _retractions = d.pop("retractions", UNSET)
        retractions: list[UpdateExtractionReviewRequestRetractionsItem] | Unset = UNSET
        if _retractions is not UNSET:
            retractions = []
            for retractions_item_data in _retractions:
                retractions_item = UpdateExtractionReviewRequestRetractionsItem.from_dict(retractions_item_data)



                retractions.append(retractions_item)


        update_extraction_review_request = cls(
            expected_version=expected_version,
            confirmations=confirmations,
            retractions=retractions,
        )

        return update_extraction_review_request
